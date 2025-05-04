; Script personalizado para instaladores NSIS
; Este script executa o instalador de certificados após a conclusão da instalação

!macro customInstall
  ; Executar o script de instalação do certificado
  ExecWait '"$INSTDIR\resources\scripts\install-cert-win.bat"'
!macroend