import os
import time  # Added import for Python's time module
from PyQt5.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QLabel, QLineEdit, QRadioButton, QButtonGroup, 
    QPushButton, QGroupBox, QFormLayout, QTabWidget,
    QTableWidget, QTableWidgetItem, QHeaderView,
    QProgressBar, QTextEdit, QFileDialog,
    QCheckBox, QMessageBox
)
from PyQt5.QtCore import Qt, QThread, pyqtSignal, QTimer
from services.tcp_client import TCPClient
from services.worker_manager import WorkerManager

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        
        self.setWindowTitle("Consulta de CPF - PyQt Client")
        self.setMinimumSize(800, 600)
        
        # Request counter for identifying requests
        self.request_counter = 0
        
        # Dictionary to store request start times
        self.request_times = {}
        
        # Initialize worker manager
        self.worker_manager = WorkerManager(use_workers=False)  # Configurado para sempre usar modo sem worker
        
        # Set up the UI
        self.setup_ui()
        
    def setup_ui(self):
        # Create central widget and main layout
        central_widget = QWidget()
        main_layout = QVBoxLayout(central_widget)
        
        # Connection settings section
        connection_group = QGroupBox("Configurações de Conexão")
        connection_layout = QFormLayout()
        
        self.host_input = QLineEdit("192.168.0.101")
        self.port_input = QLineEdit("5000")
        connection_layout.addRow("Host:", self.host_input)
        connection_layout.addRow("Porta:", self.port_input)
        
        connection_group.setLayout(connection_layout)
        main_layout.addWidget(connection_group)
        
        # Query type section
        query_type_group = QGroupBox("Tipo de Busca")
        query_type_layout = QHBoxLayout()
        
        self.query_type_group = QButtonGroup()
        self.name_radio = QRadioButton("Por Nome")
        self.exact_name_radio = QRadioButton("Por Nome Exato")
        self.cpf_radio = QRadioButton("Por CPF")
        
        self.query_type_group.addButton(self.name_radio, 1)
        self.query_type_group.addButton(self.exact_name_radio, 2)
        self.query_type_group.addButton(self.cpf_radio, 3)
        
        # Default selection
        self.name_radio.setChecked(True)
        
        query_type_layout.addWidget(self.name_radio)
        query_type_layout.addWidget(self.exact_name_radio)
        query_type_layout.addWidget(self.cpf_radio)
        
        query_type_group.setLayout(query_type_layout)
        main_layout.addWidget(query_type_group)
        
        # Search input section
        search_group = QGroupBox("Termo de Busca")
        search_layout = QVBoxLayout()
        
        self.search_input = QLineEdit()
        search_layout.addWidget(self.search_input)
        
        # Batch mode checkbox
        batch_mode_layout = QHBoxLayout()
        self.batch_mode_checkbox = QCheckBox("Modo de requisições múltiplas")
        
        batch_mode_layout.addWidget(self.batch_mode_checkbox)
        search_layout.addLayout(batch_mode_layout)
        
        # Batch size input (hidden by default)
        batch_size_layout = QHBoxLayout()
        batch_size_layout.addWidget(QLabel("Número de requisições:"))
        self.batch_size_input = QLineEdit("10")
        batch_size_layout.addWidget(self.batch_size_input)
        search_layout.addLayout(batch_size_layout)
        
        # Batch terms input (hidden by default)
        self.batch_terms_input = QTextEdit()
        self.batch_terms_input.setPlaceholderText("Termo 1\nTermo 2\nTermo 3")
        search_layout.addWidget(self.batch_terms_input)
        
        # File upload button (hidden by default)
        self.file_upload_button = QPushButton("Carregar arquivo de termos")
        search_layout.addWidget(self.file_upload_button)
        
        search_group.setLayout(search_layout)
        main_layout.addWidget(search_group)
        
        # Hide batch-related widgets initially
        self.batch_size_input.setVisible(False)
        self.batch_terms_input.setVisible(False)
        self.file_upload_button.setVisible(False)
        
        # Connect batch mode checkbox
        self.batch_mode_checkbox.stateChanged.connect(self.toggle_batch_mode)
        self.file_upload_button.clicked.connect(self.load_file)
        
        # Search button
        self.search_button = QPushButton("Buscar")
        self.search_button.clicked.connect(self.perform_search)
        main_layout.addWidget(self.search_button)
        
        # Results section with tabs
        results_tabs = QTabWidget()
        
        # Individual queries tab
        self.queries_tab = QWidget()
        queries_layout = QVBoxLayout(self.queries_tab)
        self.queries_table = QTableWidget(0, 5)
        self.queries_table.setHorizontalHeaderLabels(["ID", "Termo", "Status", "Progresso", "Tempo (s)"])
        self.queries_table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        queries_layout.addWidget(self.queries_table)
        
        # Results display
        self.results_table = QTableWidget(0, 4)
        self.results_table.setHorizontalHeaderLabels(["CPF", "Nome", "Sexo", "Data de Nascimento"])
        self.results_table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        queries_layout.addWidget(self.results_table)
        
        # Batch queries tab
        self.batch_tab = QWidget()
        batch_layout = QVBoxLayout(self.batch_tab)
        self.batch_table = QTableWidget(0, 5)
        self.batch_table.setHorizontalHeaderLabels(["ID de Lote", "Status", "Progresso", "Resultados", "Tempo Total (s)"])
        self.batch_table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        batch_layout.addWidget(self.batch_table)
        
        # Add tabs to tab widget
        results_tabs.addTab(self.queries_tab, "Consultas Individuais")
        results_tabs.addTab(self.batch_tab, "Consultas em Lote")
        
        main_layout.addWidget(results_tabs)
        
        # Set central widget
        self.setCentralWidget(central_widget)
        
    def toggle_batch_mode(self, state):
        # Show/hide batch-related widgets based on checkbox state
        is_batch_mode = state == Qt.Checked
        self.batch_size_input.setVisible(is_batch_mode)
        self.batch_terms_input.setVisible(is_batch_mode)
        self.file_upload_button.setVisible(is_batch_mode)
        
        # Update search button text
        if is_batch_mode:
            self.search_button.setText("Executar Requisições em Lote")
        else:
            self.search_button.setText("Buscar")
    
    def load_file(self):
        # Open file dialog to select a file
        file_path, _ = QFileDialog.getOpenFileName(self, "Abrir Arquivo de Termos", "", "Arquivos de Texto (*.txt *.csv)")
        
        if file_path:
            try:
                with open(file_path, 'r') as file:
                    content = file.read()
                    self.batch_terms_input.setPlainText(content)
            except Exception as e:
                QMessageBox.critical(self, "Erro", f"Falha ao ler o arquivo: {str(e)}")
    
    def get_query_type(self):
        if self.name_radio.isChecked():
            return "name"
        elif self.exact_name_radio.isChecked():
            return "exactName"
        else:
            return "cpf"
    
    def format_cpf(self, cpf):
        # Remove non-numeric characters
        cleaned = ''.join(filter(str.isdigit, cpf))
        if len(cleaned) != 11:
            return cleaned  # Return as is if not 11 digits
        
        # Format as XXX.XXX.XXX-XX
        return f"{cleaned[:3]}.{cleaned[3:6]}.{cleaned[6:9]}-{cleaned[9:]}"

    def perform_search(self):
        # Get host and port
        host = self.host_input.text().strip()
        port_text = self.port_input.text().strip()
        
        # Validate host and port
        if not host:
            QMessageBox.warning(self, "Aviso", "Host não pode estar vazio")
            return
        
        try:
            port = int(port_text)
            if port <= 0 or port > 65535:
                raise ValueError("Porta deve estar entre 1 e 65535")
        except ValueError:
            QMessageBox.warning(self, "Aviso", "Porta inválida. Digite um número entre 1 e 65535.")
            return
        
        # Check if batch mode is enabled
        is_batch_mode = self.batch_mode_checkbox.isChecked()
        
        if is_batch_mode:
            # Get batch terms
            batch_text = self.batch_terms_input.toPlainText().strip()
            batch_terms = [term.strip() for term in batch_text.replace(',', '\n').split('\n') if term.strip()]
            
            if not batch_terms:
                QMessageBox.warning(self, "Aviso", "Nenhum termo de busca fornecido para consulta em lote")
                return
                
            # Get batch size
            try:
                batch_size = int(self.batch_size_input.text())
                if batch_size <= 0:
                    raise ValueError()
            except ValueError:
                QMessageBox.warning(self, "Aviso", "Número de requisições inválido")
                return
                
            # Execute batch query
            self.execute_batch_query(host, port, batch_terms, batch_size)
        else:
            # Single query mode
            search_term = self.search_input.text().strip()
            
            if not search_term:
                QMessageBox.warning(self, "Aviso", "Termo de busca não pode estar vazio")
                return
                
            # Execute single query
            self.execute_query(host, port, search_term)
    
    def execute_query(self, host, port, search_term):
        # Increment request counter
        self.request_counter += 1
        query_id = f"query_{self.request_counter}_{int(time.time() * 1000)}"
        
        # Registrar o tempo inicial da requisição
        self.request_times[query_id] = time.time()
        
        # Get query type
        query_type = self.get_query_type()
        
        # Format CPF if needed
        if query_type == "cpf":
            search_term = ''.join(filter(str.isdigit, search_term))
        
        # Add query to table
        row_position = self.queries_table.rowCount()
        self.queries_table.insertRow(row_position)
        self.queries_table.setItem(row_position, 0, QTableWidgetItem(str(self.request_counter)))
        self.queries_table.setItem(row_position, 1, QTableWidgetItem(search_term))
        self.queries_table.setItem(row_position, 2, QTableWidgetItem("Pendente"))
        
        # Create progress bar
        progress_bar = QProgressBar()
        progress_bar.setRange(0, 100)
        progress_bar.setValue(0)
        self.queries_table.setCellWidget(row_position, 3, progress_bar)
        self.queries_table.setItem(row_position, 4, QTableWidgetItem("Calculando..."))
        
        # Define callbacks
        def on_progress(update):
            progress_bar.setValue(int(update["progress"]))
            self.queries_table.setItem(row_position, 2, QTableWidgetItem(update["status"]))
            
        def on_complete(results):
            # Calcular o tempo de execução
            elapsed_time = time.time() - self.request_times.get(query_id, time.time())
            elapsed_str = f"{elapsed_time:.2f}"
            
            progress_bar.setValue(100)
            self.queries_table.setItem(row_position, 2, QTableWidgetItem("Concluído"))
            self.queries_table.setItem(row_position, 4, QTableWidgetItem(elapsed_str))
            self.display_results(results)
            
        def on_error(error):
            # Calcular o tempo até o erro
            elapsed_time = time.time() - self.request_times.get(query_id, time.time())
            elapsed_str = f"{elapsed_time:.2f}"
            
            progress_bar.setValue(0)
            self.queries_table.setItem(row_position, 2, QTableWidgetItem(f"Erro: {error}"))
            self.queries_table.setItem(row_position, 4, QTableWidgetItem(elapsed_str))
            QMessageBox.warning(self, "Erro na Consulta", f"Ocorreu um erro: {error}")
        
        # Execute query
        self.worker_manager.execute_query(
            {
                "host": host,
                "port": port,
                "search_term": search_term,
                "query_type": query_type,
                "query_id": query_id,
                "request_number": self.request_counter
            },
            {
                "on_progress": on_progress,
                "on_complete": on_complete,
                "on_error": on_error
            }
        )
        
    def execute_batch_query(self, host, port, batch_terms, batch_size):
        # Get query type
        query_type = self.get_query_type()
        
        # Create batch ID
        batch_id = f"batch_{int(time.time() * 1000)}"
        
        # Registrar o tempo inicial do lote de consultas
        self.request_times[batch_id] = time.time()
        
        # Add batch to table
        row_position = self.batch_table.rowCount()
        self.batch_table.insertRow(row_position)
        
        # Show number of terms to process
        terms_to_process = min(len(batch_terms), batch_size)
        self.batch_table.setItem(row_position, 0, QTableWidgetItem(f"Lote #{row_position+1} ({terms_to_process} termos)"))
        self.batch_table.setItem(row_position, 1, QTableWidgetItem("Pendente"))
        self.batch_table.setItem(row_position, 3, QTableWidgetItem("0"))
        self.batch_table.setItem(row_position, 4, QTableWidgetItem("Calculando..."))
        
        # Create progress bar
        progress_bar = QProgressBar()
        progress_bar.setRange(0, 100)
        progress_bar.setValue(0)
        self.batch_table.setCellWidget(row_position, 2, progress_bar)
        
        # Keep track of completed queries and results
        completed_queries = 0
        all_results = []
        
        # Process each term
        terms_to_process_list = batch_terms[:batch_size]
        
        for term in terms_to_process_list:
            # Increment request counter
            self.request_counter += 1
            query_id = f"{batch_id}_{self.request_counter}"
            
            # Define callbacks for this term
            def make_on_complete(term_index):
                def on_complete(results):
                    nonlocal completed_queries, all_results
                    completed_queries += 1
                    all_results.extend(results)
                    
                    # Update progress
                    progress = (completed_queries / terms_to_process) * 100
                    progress_bar.setValue(int(progress))
                    
                    # Update status
                    self.batch_table.setItem(row_position, 1, 
                                            QTableWidgetItem(f"Processando ({completed_queries}/{terms_to_process})"))
                    
                    # Update results count
                    self.batch_table.setItem(row_position, 3, QTableWidgetItem(str(len(all_results))))
                    
                    # Check if batch is complete
                    if completed_queries >= terms_to_process:
                        self.batch_table.setItem(row_position, 1, QTableWidgetItem("Concluído"))
                        
                        # Calcular o tempo total de execução do lote
                        elapsed_time = time.time() - self.request_times.get(batch_id, time.time())
                        elapsed_str = f"{elapsed_time:.2f}"
                        self.batch_table.setItem(row_position, 4, QTableWidgetItem(elapsed_str))
                        
                        self.display_results(all_results)
                        
                return on_complete
            
            def make_on_error(term_index):
                def on_error(error):
                    nonlocal completed_queries
                    completed_queries += 1
                    
                    # Update progress
                    progress = (completed_queries / terms_to_process) * 100
                    progress_bar.setValue(int(progress))
                    
                    # Update status with error info
                    current_status = self.batch_table.item(row_position, 1).text()
                    if "Erro" not in current_status:
                        self.batch_table.setItem(row_position, 1, 
                                                QTableWidgetItem(f"{current_status} (Erro em alguns termos)"))
                    
                    # Check if batch is complete
                    if completed_queries >= terms_to_process:
                        self.batch_table.setItem(row_position, 1, 
                                               QTableWidgetItem("Concluído com erros"))
                        
                        # Calcular o tempo total de execução do lote
                        elapsed_time = time.time() - self.request_times.get(batch_id, time.time())
                        elapsed_str = f"{elapsed_time:.2f}"
                        self.batch_table.setItem(row_position, 4, QTableWidgetItem(elapsed_str))
                        
                        self.display_results(all_results)
                        
                return on_error
            
            # Format term if CPF
            if query_type == "cpf":
                term = ''.join(filter(str.isdigit, term))
            
            # Execute query
            self.worker_manager.execute_query(
                {
                    "host": host,
                    "port": port,
                    "search_term": term,
                    "query_type": query_type,
                    "query_id": query_id,
                    "request_number": self.request_counter
                },
                {
                    "on_progress": None,  # No progress tracking for individual terms in batch
                    "on_complete": make_on_complete(term),
                    "on_error": make_on_error(term)
                }
            )
    
    def display_results(self, results):
        # Clear current results
        self.results_table.setRowCount(0)
        
        # Add each result to the table
        for result in results:
            row_position = self.results_table.rowCount()
            self.results_table.insertRow(row_position)
            
            # Format CPF for display
            cpf = self.format_cpf(result.get("cpf", ""))
            
            self.results_table.setItem(row_position, 0, QTableWidgetItem(cpf))
            self.results_table.setItem(row_position, 1, QTableWidgetItem(result.get("nome", "")))
            self.results_table.setItem(row_position, 2, QTableWidgetItem(result.get("sexo", "")))
            self.results_table.setItem(row_position, 3, QTableWidgetItem(result.get("nasc", "")))