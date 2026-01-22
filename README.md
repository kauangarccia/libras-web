LIBRAS Web

📌 Sobre o Projeto
O LIBRAS Web é uma aplicação web para reconhecimento de letras do alfabeto em LIBRAS, utilizando visão computacional e aprendizado de máquina.
O usuário realiza o sinal com a mão, o sistema identifica a letra e permite treinar palavras pré-definidas, formando letra por letra até concluir corretamente.
O projeto funciona diretamente pelo navegador.

🎯 Objetivo
Reconhecer letras do alfabeto em LIBRAS
Auxiliar no aprendizado da LIBRAS
Aplicar conceitos de Visão Computacional e Machine Learning
Integrar frontend web com backend em Python

⚙️ Como Funciona
O navegador acessa a câmera do dispositivo
A mão é detectada e seus pontos (landmarks) são extraídos
Esses dados são enviados para o backend
O modelo de Machine Learning identifica a letra
A letra é validada na palavra alvo exibida na tela

🧠 Treino por Palavras
O sistema mostra uma palavra alvo
O usuário faz os sinais das letras
Cada letra correta é adicionada à palavra
Ao completar a palavra, o sistema avança para a próxima
Existe botão para apagar a última letra

📚 Bibliotecas Utilizadas
Backend (Python)
Flask – criação da API
Flask-CORS – comunicação com o frontend
TensorFlow / Keras – carregamento do modelo treinado
NumPy – manipulação de dados numéricos
Frontend (Web)
MediaPipe Hands – detecção da mão e landmarks
JavaScript – lógica da aplicação
HTML5 – estrutura da página
CSS3 – estilização da interface

🔤 Letras Reconhecidas
O sistema reconhece apenas as letras:
A, C, D, E, I, L, N, O, P, R, S, V, W
Essas letras foram escolhidas por apresentarem melhor desempenho nos testes.

⚠️ Limitações
Reconhece somente letras treinadas
Sensível à iluminação e posicionamento da mão
Algumas letras podem gerar confusão por gestos semelhantes
Não reconhece palavras completas automaticamente
Funciona apenas com sinais estáticos

