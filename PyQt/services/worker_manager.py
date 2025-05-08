import time
import queue
import multiprocessing
from threading import Thread, Lock
from typing import Dict, List, Any, Callable, Optional

from PyQt5.QtCore import QObject, pyqtSignal, pyqtSlot

from .tcp_client import TCPClient

# Type definitions
QueryOptions = Dict[str, Any]
Callbacks = Dict[str, Callable]

class Worker(multiprocessing.Process):
    """
    Worker process that executes a single query
    """
    def __init__(self, options: QueryOptions, result_queue: multiprocessing.Queue):
        super().__init__()
        self.options = options
        self.result_queue = result_queue
        self.daemon = True  # Worker dies when main process exits
        
    def run(self):
        """Execute the query and put results in the queue"""
        try:
            # Extract options
            host = self.options.get("host")
            port = self.options.get("port")
            search_term = self.options.get("search_term")
            query_type = self.options.get("query_type")
            query_id = self.options.get("query_id")
            request_number = self.options.get("request_number")
            
            # Create progress callback handler
            def on_progress_update(update):
                self.result_queue.put({
                    "type": "progress",
                    "query_id": query_id,
                    "update": update
                })
            
            # Create client
            client = TCPClient(
                host=host,
                port=port,
                use_https=True,
                request_number=request_number,
                on_progress_update=on_progress_update if query_type != "cpf" else None
            )
            
            # Simulate progress for CPF queries
            if query_type == "cpf":
                # Start time for calculating progress
                start_time = time.time()
                estimated_time = 5.0  # seconds
                
                # Start a thread to update progress
                def update_progress():
                    while True:
                        elapsed = time.time() - start_time
                        progress = min(95, (elapsed / estimated_time) * 100)
                        
                        # Determine status based on progress
                        if progress < 25:
                            status = "Iniciando consulta"
                            message = "Conectando ao servidor"
                        elif progress < 50:
                            status = "Consultando"
                            message = "Processando solicitação"
                        elif progress < 75:
                            status = "Analisando"
                            message = "Formatando resultados"
                        else:
                            status = "Finalizando"
                            message = "Preparando resposta"
                        
                        # Send progress update
                        self.result_queue.put({
                            "type": "progress",
                            "query_id": query_id,
                            "update": {
                                "progress": progress,
                                "status": status,
                                "message": message
                            }
                        })
                        
                        if progress >= 95:
                            break
                            
                        time.sleep(0.1)  # Update every 100ms
                
                # Start progress thread
                progress_thread = Thread(target=update_progress)
                progress_thread.daemon = True
                progress_thread.start()
            
            # Execute query
            results = None
            try:
                if query_type == "name":
                    results = client.get_person_by_name(search_term)
                elif query_type == "exactName":
                    results = client.get_person_by_exact_name(search_term)
                else:
                    results = client.get_person_by_cpf(search_term)
                    
                # Send success result
                self.result_queue.put({
                    "type": "result",
                    "query_id": query_id,
                    "results": results
                })
                
            except Exception as e:
                # Send error result
                self.result_queue.put({
                    "type": "error",
                    "query_id": query_id,
                    "error": str(e)
                })
                
        except Exception as e:
            # Handle any unexpected errors
            self.result_queue.put({
                "type": "error",
                "query_id": self.options.get("query_id", "unknown"),
                "error": f"Unexpected worker error: {str(e)}"
            })

class ThreadedExecutor(Thread):
    """
    Thread-based executor as an alternative to multiprocessing
    """
    def __init__(self, options: QueryOptions, result_queue: queue.Queue):
        super().__init__()
        self.options = options
        self.result_queue = result_queue
        self.daemon = True  # Thread dies when main process exits
        
    def run(self):
        """Execute the query and put results in the queue"""
        try:
            # Extract options
            host = self.options.get("host")
            port = self.options.get("port")
            search_term = self.options.get("search_term")
            query_type = self.options.get("query_type")
            query_id = self.options.get("query_id")
            request_number = self.options.get("request_number")
            
            # Create progress callback handler
            def on_progress_update(update):
                self.result_queue.put({
                    "type": "progress",
                    "query_id": query_id,
                    "update": update
                })
            
            # Create client
            client = TCPClient(
                host=host,
                port=port,
                use_https=True,
                request_number=request_number,
                on_progress_update=on_progress_update if query_type != "cpf" else None
            )
            
            # Simulate progress for CPF queries
            if query_type == "cpf":
                # Start time for calculating progress
                start_time = time.time()
                estimated_time = 5.0  # seconds
                
                # Start a thread to update progress
                def update_progress():
                    while True:
                        elapsed = time.time() - start_time
                        progress = min(95, (elapsed / estimated_time) * 100)
                        
                        # Determine status based on progress
                        if progress < 25:
                            status = "Iniciando consulta"
                            message = "Conectando ao servidor"
                        elif progress < 50:
                            status = "Consultando"
                            message = "Processando solicitação"
                        elif progress < 75:
                            status = "Analisando"
                            message = "Formatando resultados"
                        else:
                            status = "Finalizando"
                            message = "Preparando resposta"
                        
                        # Send progress update
                        self.result_queue.put({
                            "type": "progress",
                            "query_id": query_id,
                            "update": {
                                "progress": progress,
                                "status": status,
                                "message": message
                            }
                        })
                        
                        if progress >= 95:
                            break
                            
                        time.sleep(0.1)  # Update every 100ms
                
                # Start progress thread
                progress_thread = Thread(target=update_progress)
                progress_thread.daemon = True
                progress_thread.start()
            
            # Execute query
            results = None
            try:
                if query_type == "name":
                    results = client.get_person_by_name(search_term)
                elif query_type == "exactName":
                    results = client.get_person_by_exact_name(search_term)
                else:
                    results = client.get_person_by_cpf(search_term)
                    
                # Send success result
                self.result_queue.put({
                    "type": "result",
                    "query_id": query_id,
                    "results": results
                })
                
            except Exception as e:
                # Send error result
                self.result_queue.put({
                    "type": "error",
                    "query_id": query_id,
                    "error": str(e)
                })
                
        except Exception as e:
            # Handle any unexpected errors
            self.result_queue.put({
                "type": "error",
                "query_id": self.options.get("query_id", "unknown"),
                "error": f"Unexpected worker error: {str(e)}"
            })

class ResultProcessor(QObject):
    """
    Processes results from workers and invokes callbacks
    """
    # Define signals
    progress_signal = pyqtSignal(str, dict)
    result_signal = pyqtSignal(str, list)
    error_signal = pyqtSignal(str, str)
    
    def __init__(self):
        super().__init__()
        
        # Maps query IDs to callbacks
        self.callbacks = {}
        
    def register_callbacks(self, query_id: str, callbacks: Callbacks):
        """Register callbacks for a query ID"""
        self.callbacks[query_id] = callbacks
        
    def unregister_callbacks(self, query_id: str):
        """Unregister callbacks for a query ID"""
        if query_id in self.callbacks:
            del self.callbacks[query_id]
            
    @pyqtSlot(str, dict)
    def handle_progress(self, query_id: str, update: Dict):
        """Handle progress update from worker"""
        callbacks = self.callbacks.get(query_id, {})
        on_progress = callbacks.get("on_progress")
        
        if on_progress:
            on_progress(update)
    
    @pyqtSlot(str, list)
    def handle_result(self, query_id: str, results: List):
        """Handle result from worker"""
        callbacks = self.callbacks.get(query_id, {})
        on_complete = callbacks.get("on_complete")
        
        if on_complete:
            on_complete(results)
        
        # Clean up callbacks
        self.unregister_callbacks(query_id)
    
    @pyqtSlot(str, str)
    def handle_error(self, query_id: str, error: str):
        """Handle error from worker"""
        callbacks = self.callbacks.get(query_id, {})
        on_error = callbacks.get("on_error")
        
        if on_error:
            on_error(error)
        
        # Clean up callbacks
        self.unregister_callbacks(query_id)

class WorkerManager(QObject):
    """
    Gerencia execução paralela de consultas usando threads
    """
    def __init__(self, use_workers: bool = False):
        super().__init__()
        
        # Connection limits
        self.max_connections = multiprocessing.cpu_count()
        self.active_connections = 0
        
        # Pending queries
        self.pending_queries = []
        self.active_workers = {}
        
        # Queue for thread results (sempre usando queue.Queue)
        self.result_queue = queue.Queue()
        
        # Result processor
        self.result_processor = ResultProcessor()
        
        # Connect signals
        self.result_processor.progress_signal.connect(self.result_processor.handle_progress)
        self.result_processor.result_signal.connect(self.result_processor.handle_result)
        self.result_processor.error_signal.connect(self.result_processor.handle_error)
        
        # Start the result processing thread
        self.should_stop = False
        self.result_thread = Thread(target=self._process_results)
        self.result_thread.daemon = True
        self.result_thread.start()
    
    def _process_results(self):
        """Process results from the result queue"""
        while not self.should_stop:
            try:
                # Get result from queue (with timeout to allow checking should_stop)
                try:
                    result = self.result_queue.get(timeout=0.1)
                except (queue.Empty, TimeoutError):
                    continue
                
                # Process result based on type
                query_id = result.get("query_id")
                
                if result["type"] == "progress":
                    self.result_processor.progress_signal.emit(query_id, result["update"])
                elif result["type"] == "result":
                    self.result_processor.result_signal.emit(query_id, result["results"])
                    # Process next query in queue
                    self._finish_query(query_id)
                elif result["type"] == "error":
                    self.result_processor.error_signal.emit(query_id, result["error"])
                    # Process next query in queue
                    self._finish_query(query_id)
                    
            except Exception as e:
                print(f"Error processing results: {str(e)}")
    
    def _finish_query(self, query_id: str):
        """Clean up after a query is finished"""
        # Remove from active workers
        if query_id in self.active_workers:
            # Note: we don't terminate the worker as it will already be done
            del self.active_workers[query_id]
        
        # Decrement active connections counter
        self.active_connections -= 1
        print(f"Finished query {query_id}. Active connections: {self.active_connections}")
        
        # Process next query in queue
        self._process_next_query()
    
    def _process_next_query(self):
        """Process the next query in the queue if possible"""
        if self.pending_queries and self.active_connections < self.max_connections:
            # Get next query
            next_query = self.pending_queries.pop(0)
            options = next_query["options"]
            callbacks = next_query["callbacks"]
            
            # Execute query
            self._execute_query(options, callbacks)
    
    def execute_query(self, options: QueryOptions, callbacks: Callbacks):
        """
        Execute a query using a worker
        
        Args:
            options: Query options
            callbacks: Callbacks for progress, completion, and errors
        """
        # Register callbacks
        query_id = options.get("query_id")
        self.result_processor.register_callbacks(query_id, callbacks)
        
        # Check if we can execute immediately or need to queue
        if self.active_connections >= self.max_connections:
            print(f"Queueing query {query_id}. Active connections: {self.active_connections}")
            self.pending_queries.append({"options": options, "callbacks": callbacks})
        else:
            self._execute_query(options, callbacks)
    
    def _execute_query(self, options: QueryOptions, callbacks: Callbacks):
        """
        Execute a query immediately
        
        Args:
            options: Query options
            callbacks: Callbacks for progress, completion, and errors
        """
        # Increment active connections counter
        self.active_connections += 1
        query_id = options.get("query_id")
        print(f"Executing query {query_id}. Active connections: {self.active_connections}")
        
        # Sempre usar ThreadedExecutor (modo sem worker) que demonstrou melhor desempenho
        executor = ThreadedExecutor(options, self.result_queue)
        executor.start()
        self.active_workers[query_id] = executor
    
    def cancel_query(self, query_id: str):
        """
        Cancel a running query
        
        Args:
            query_id: ID of query to cancel
        """
        # Terminate worker if active
        if query_id in self.active_workers:
            worker = self.active_workers[query_id]
            if isinstance(worker, multiprocessing.Process):
                worker.terminate()
            # Remove from active workers
            del self.active_workers[query_id]
            
            # Unregister callbacks
            self.result_processor.unregister_callbacks(query_id)
            
            # Decrement active connections counter
            self.active_connections -= 1
            
            # Process next query in queue
            self._process_next_query()
    
    def cancel_all_queries(self):
        """Cancel all running queries"""
        # Create a copy of keys to avoid modifying during iteration
        query_ids = list(self.active_workers.keys())
        
        # Cancel each query
        for query_id in query_ids:
            self.cancel_query(query_id)
        
        # Clear pending queries
        self.pending_queries.clear()
    
    def shutdown(self):
        """Shutdown the worker manager"""
        # Signal threads to stop
        self.should_stop = True
        
        # Cancel all queries
        self.cancel_all_queries()
        
        # Wait for result thread to finish
        if self.result_thread.is_alive():
            self.result_thread.join(1.0)  # Wait up to 1 second