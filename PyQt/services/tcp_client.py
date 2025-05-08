import os
import json
import time
import requests
import urllib3
import urllib.parse
import ssl
from pathlib import Path
from typing import Dict, List, Optional, Callable, Any, Union
import socket
import threading
import selectors
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Disable insecure request warnings for development
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class TimeoutSession(requests.Session):
    """
    Custom requests Session that resets read timeout when data is received.
    """
    def __init__(self, timeout=240.0):
        super().__init__()
        self.timeout = timeout
        self.last_activity = time.time()
        self.timeout_timer = None
        self.is_active = True

    def reset_timeout(self):
        """Reset the timeout timer"""
        self.last_activity = time.time()
        
    def is_timed_out(self):
        """Check if the session has timed out"""
        return (time.time() - self.last_activity) > self.timeout

class TCPClient:
    def __init__(
        self, 
        host: str, 
        port: int, 
        use_https: bool = True, 
        request_number: int = 1,
        on_progress_update: Optional[Callable[[Dict], None]] = None
    ):
        """
        Initialize TCP Client with connection parameters
        
        Args:
            host: Server hostname or IP
            port: Server port
            use_https: Whether to use HTTPS (default True)
            request_number: Request ID for tracking
            on_progress_update: Callback function for progress updates
        """
        # Setup base URL
        protocol = "https" if use_https else "http"
        self.base_url = f"{protocol}://{host}:{port}"
        
        # Configuration
        self.request_number = request_number
        self.on_progress_update = on_progress_update
        self.max_retries = 3
        self.retry_delay = 240
        self.timeout = 240 
        
        # Set up SSL context with our certificates
        self.cert_path = self._get_ssl_cert_path()
    
    def _get_ssl_cert_path(self) -> tuple:
        """Get path to SSL certificates"""
        script_dir = Path(__file__).resolve().parent.parent
        cert_path = script_dir / "ssl" / "cert.pem"
        key_path = script_dir / "ssl" / "key.pem"
        
        # Verify certificates exist
        if not cert_path.exists() or not key_path.exists():
            print(f"Warning: Certificate files not found at {cert_path} or {key_path}")
            return None
            
        return (str(cert_path), str(key_path))
    
    def format_cpf(self, cpf: str) -> str:
        """Format CPF by removing non-numeric characters"""
        # Remove all non-numeric characters
        cleaned = ''.join(filter(str.isdigit, cpf))
        
        # Ensure it has 11 digits
        if len(cleaned) != 11:
            raise ValueError("CPF must contain 11 digits")
            
        return cleaned
    
    def _get_headers(self) -> Dict[str, str]:
        """Get HTTP headers for requests"""
        return {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    
    def _delay(self, seconds: float) -> None:
        """Utility to delay execution"""
        time.sleep(seconds)
    
    def _make_request(self, path: str) -> Any:
        """
        Make a standard non-streaming HTTP request
        
        Args:
            path: The API endpoint path
            
        Returns:
            The JSON response from the server
        """
        retry_count = 0
        last_error = None
        
        while retry_count <= self.max_retries:
            try:
                print(f"[{self.request_number}] Attempt {retry_count + 1}/{self.max_retries + 1} for: {path}")
                start_time = time.time()
                
                url = f"{self.base_url}{path}"
                
                # Make request with SSL verification disabled for development
                response = requests.get(
                    url,
                    headers=self._get_headers(),
                    timeout=self.timeout,
                    verify=False,  # Using our own cert but skipping verification
                    # cert=self.cert_path  # Uncomment if server requires client certificates
                )
                
                # Check for errors
                response.raise_for_status()
                
                # Parse response
                result = response.json()
                
                print(f"[{self.request_number}] Response received in {time.time() - start_time:.2f}s")
                
                return result
                
            except requests.RequestException as error:
                # Handle request errors
                retry_count += 1
                last_error = error
                
                if isinstance(error, requests.Timeout):
                    print(f"[{self.request_number}] Request timed out after {self.timeout}s")
                else:
                    print(f"[{self.request_number}] Error on attempt {retry_count}: {str(error)}")
                
                # Retry with delay if attempts remain
                if retry_count <= self.max_retries:
                    wait_time = self.retry_delay
                    print(f"[{self.request_number}] Waiting {wait_time}s before next attempt")
                    self._delay(wait_time)
        
        # If we get here, all retries failed
        print(f"[{self.request_number}] All {self.max_retries + 1} attempts failed")
        raise last_error or Exception("Failed after multiple attempts")
    
    def _make_streaming_request(self, path: str) -> List[Dict]:
        """
        Make a streaming HTTP request and process incremental JSON responses with active timeout management
        
        Args:
            path: The API endpoint path
            
        Returns:
            List of results from the streamed response
        """
        retry_count = 0
        last_error = None
        
        while retry_count <= self.max_retries:
            try:
                print(f"[{self.request_number}] Stream attempt {retry_count + 1}/{self.max_retries + 1} for: {path}")
                start_time = time.time()
                
                url = f"{self.base_url}{path}"
                
                # Create a session with custom timeout
                session = requests.Session()
                adapter = HTTPAdapter(
                    max_retries=Retry(
                        total=0,  # We handle retries manually
                        connect=0,
                        backoff_factor=0.5
                    )
                )
                session.mount('http://', adapter)
                session.mount('https://', adapter)
                
                # Initial timeout is shorter for connection, longer for reads
                initial_timeout = (5.0, 90.0)  # (connect timeout, read timeout)
                
                # Start streaming request
                response = session.get(
                    url,
                    headers=self._get_headers(),
                    stream=True,
                    timeout=initial_timeout,
                    verify=False  # Using our own cert but skipping verification
                    # cert=self.cert_path  # Uncomment if server requires client certificates
                )
                
                # Check for errors
                response.raise_for_status()
                
                # Variables for tracking streaming state
                incomplete_json = ""
                results = []
                last_data_time = time.time()  # Time of last data received
                last_progress_time = time.time()
                last_progress_reported = 0
                inactivity_timeout = 60.0  # Maximum seconds to wait without data
                
                # Generate an initial progress update
                if self.on_progress_update:
                    self.on_progress_update({
                        "progress": 0,
                        "status": "Iniciando busca",
                        "message": "Conectando ao servidor"
                    })
                
                # Create a thread to monitor for timeout
                stop_event = threading.Event()
                
                def timeout_monitor():
                    while not stop_event.is_set():
                        current_time = time.time()
                        time_since_last_data = current_time - last_data_time
                        
                        # Check for inactivity timeout
                        if time_since_last_data > inactivity_timeout:
                            print(f"[{self.request_number}] Stream inactivity timeout after {inactivity_timeout}s without data")
                            # Force the request to stop
                            try:
                                response.close()
                            except:
                                pass
                            return
                            
                        # Sleep a bit before checking again
                        stop_event.wait(1.0)
                
                # Start timeout monitor thread
                monitor_thread = threading.Thread(target=timeout_monitor)
                monitor_thread.daemon = True
                monitor_thread.start()
                
                try:
                    # Use a smaller chunk size to get more frequent updates
                    for chunk in response.iter_content(chunk_size=512, decode_unicode=False):
                        if not chunk:
                            continue
                            
                        # Update the last data time whenever we receive data
                        last_data_time = time.time()
                        
                        # Get text from chunk
                        if isinstance(chunk, bytes):
                            try:
                                chunk = chunk.decode('utf-8')
                            except UnicodeDecodeError:
                                # Skip chunks that can't be decoded
                                print(f"[{self.request_number}] Warning: Received non-UTF-8 data, skipping chunk")
                                continue
                            
                        # Process the chunk
                        current_text = incomplete_json + chunk
                        json_objects, remaining = self._extract_json_objects(current_text)
                        incomplete_json = remaining
                        
                        # Process each JSON object found
                        for json_obj in json_objects:
                            # Update progress if available
                            if 'progress' in json_obj:
                                last_progress_reported = json_obj.get('progress', 0)
                                last_progress_time = time.time()
                                
                                # Update status message
                                if 'status' not in json_obj:
                                    progress = last_progress_reported
                                    if progress < 25:
                                        json_obj['status'] = "Buscando"
                                    elif progress < 50:
                                        json_obj['status'] = "Processando"
                                    elif progress < 75:
                                        json_obj['status'] = "Analisando resultados"
                                    else:
                                        json_obj['status'] = "Finalizando"
                                
                                # Call progress callback if available
                                if self.on_progress_update:
                                    self.on_progress_update(json_obj)
                                    
                            # Check for completion and results
                            if 'isComplete' in json_obj and json_obj['isComplete'] and 'results' in json_obj:
                                results = json_obj['results']
                                
                                # Ensure we reach 100% progress
                                if self.on_progress_update and last_progress_reported < 100:
                                    self.on_progress_update({
                                        "progress": 100,
                                        "status": "Concluído",
                                        "message": "Busca finalizada com sucesso",
                                        "results": len(results)
                                    })
                                
                                print(f"[{self.request_number}] Stream completed with {len(results)} results in {time.time() - start_time:.2f}s")
                                return results
                        
                        # Send periodic progress updates if we haven't received any from the server
                        current_time = time.time()
                        time_since_last_update = current_time - last_progress_time
                        
                        if self.on_progress_update and time_since_last_update > 1.0:
                            # Estimate progress based on time if server isn't sending progress updates
                            elapsed = current_time - start_time
                            estimated_duration = 15.0  # Assume search takes ~15 seconds total
                            estimated_progress = min(95, max(last_progress_reported, (elapsed / estimated_duration) * 100))
                            
                            self.on_progress_update({
                                "progress": estimated_progress,
                                "status": "Processando",
                                "message": f"Recebendo dados do servidor... ({time.time() - last_data_time:.1f}s desde o último dado)"
                            })
                            
                            last_progress_time = current_time
                            last_progress_reported = estimated_progress
                    
                    # If we get here without completion, return any results we have
                    # or empty list if none were found
                    print(f"[{self.request_number}] Stream ended without completion in {time.time() - start_time:.2f}s")
                    
                    # Ensure we reach 100% progress
                    if self.on_progress_update:
                        self.on_progress_update({
                            "progress": 100,
                            "status": "Concluído",
                            "message": "Busca finalizada",
                            "results": len(results)
                        })
                        
                    return results
                    
                finally:
                    # Stop the timeout monitor thread
                    stop_event.set()
                    response.close()
                    
            except requests.RequestException as error:
                retry_count += 1
                last_error = error
                
                if isinstance(error, requests.Timeout):
                    print(f"[{self.request_number}] Stream request timed out after {self.timeout}s")
                else:
                    print(f"[{self.request_number}] Error on stream attempt {retry_count}: {str(error)}")
                
                # Retry with delay if attempts remain
                if retry_count <= self.max_retries:
                    wait_time = self.retry_delay * retry_count
                    print(f"[{self.request_number}] Waiting {wait_time}s before next stream attempt")
                    self._delay(wait_time)
        
        # If we get here, all retries failed
        print(f"[{self.request_number}] All {self.max_retries + 1} stream attempts failed")
        raise last_error or Exception("Failed after multiple stream attempts")
    
    def _extract_json_objects(self, text: str) -> tuple:
        """
        Extract valid JSON objects from a text stream
        
        Args:
            text: Text that may contain JSON objects
            
        Returns:
            Tuple of (list of parsed JSON objects, remaining text)
        """
        valid_objects = []
        remaining = text
        
        # Simple implementation - find complete objects between { and }
        open_braces = 0
        start_index = -1
        
        for i, char in enumerate(text):
            if (char == '{'):
                if open_braces == 0:
                    start_index = i
                open_braces += 1
            elif (char == '}'):
                open_braces -= 1
                if open_braces == 0 and start_index != -1:
                    # Found a complete JSON object
                    json_str = text[start_index:i+1]
                    try:
                        json_obj = json.loads(json_str)
                        valid_objects.append(json_obj)
                    except json.JSONDecodeError:
                        # Not a valid JSON object
                        pass
                    start_index = -1
        
        # Determine remaining text (potentially incomplete JSON)
        if start_index != -1:
            remaining = text[start_index:]
        else:
            remaining = ""
            
        return valid_objects, remaining
    
    def get_person_by_name(self, name: str) -> List[Dict]:
        """
        Search for a person by name (partial match)
        
        Args:
            name: Name to search for
            
        Returns:
            List of person records matching the name
        """
        # Use streaming request for name searches
        return self._make_streaming_request(f"/get-person-by-name/{urllib.parse.quote(name)}")
    
    def get_person_by_exact_name(self, name: str) -> List[Dict]:
        """
        Search for a person by exact name
        
        Args:
            name: Exact name to search for
            
        Returns:
            List of person records with the exact name
        """
        # Use streaming request for name searches
        return self._make_streaming_request(f"/get-person-by-exact-name/{urllib.parse.quote(name)}")
    
    def get_person_by_cpf(self, cpf: str) -> List[Dict]:
        """
        Search for a person by CPF
        
        Args:
            cpf: CPF number to search for
            
        Returns:
            List of person records with the matching CPF
        """
        try:
            # Format CPF to ensure it's valid
            formatted_cpf = self.format_cpf(cpf)
            print(f"Formatting CPF: \"{cpf}\" -> \"{formatted_cpf}\"")
            
            # Use standard request for CPF
            data = self._make_request(f"/get-person-by-cpf/{formatted_cpf}")
            return data.get("results", [])
            
        except Exception as error:
            print(f"[{self.request_number}] Error searching by CPF: {str(error)}")
            raise