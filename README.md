LIBRAS Web (MediaPipe + TensorFlow)

Aplicação web para reconhecimento de letras do alfabeto em LIBRAS usando visão computacional (MediaPipe Hands) e Machine Learning (TensorFlow).
O usuário faz o sinal com a mão, o sistema sugere a letra e permite treinar palavras pré-definidas letra por letra.

📌 Sobre o Projeto
O LIBRAS Web é uma aplicação que roda no navegador e utiliza a câmera para capturar a mão do usuário.
A partir dos landmarks da mão, o sistema gera 63 features (x, y, z de 21 pontos), normaliza os dados e envia para um backend em Python que executa a inferência em um modelo TensorFlow já treinado.

✅ Funciona em modo treino por palavras: você precisa acertar a letra esperada, adicionando manualmente quando estiver correta.

🎯 Objetivos
Reconhecer letras do alfabeto em LIBRAS (subset treinado)
Auxiliar no aprendizado e prática de sinais
Aplicar conceitos de:
Visão Computacional (landmarks da mão)
Aprendizado de Máquina (classificação)
Integração Frontend ↔ Backend (API REST)

⚙️ Como Funciona

O navegador solicita permissão da câmera

O MediaPipe Hands detecta a mão e extrai 21 landmarks

Esses pontos viram um vetor de 63 valores (x,y,z)

O frontend aplica:

Flip X (espelhamento)

Normalização pelo punho (wrist) e escala

O vetor é enviado ao backend via POST /predict

O backend retorna:

letter (letra sugerida)

confidence (confiança)

O frontend aplica uma janela de votação para estabilizar o resultado e exibe a letra

🧠 Treino por Palavras

O sistema exibe uma palavra alvo

O usuário faz o sinal da próxima letra esperada

Clique em Adicionar letra apenas quando a letra sugerida estiver correta

Ao completar a palavra, o sistema avança automaticamente

Também existem botões para:

Apagar letra

Pular palavra

🔤 Letras Reconhecidas

Este projeto reconhece apenas as letras abaixo (selecionadas por melhor desempenho nos testes):

A, C, D, E, I, L, N, O, P, R, S, V, W

📚 Bibliotecas Utilizadas

Backend (Python)

Flask — API HTTP (/health e /predict)

Flask-CORS — permite requisições do frontend

TensorFlow — carrega e executa o modelo (SavedModel)

NumPy — manipulação de vetores e probabilidades

Frontend (Web)

MediaPipe Hands — detecção da mão e extração de landmarks

JavaScript — lógica do treino, envio para backend e UI

HTML5 — estrutura

CSS3 — visual/estilização

🗂️ Estrutura do Projeto (resumo)

LIBRAS_WEB/

├─ backend/

│  ├─ server.py

│  ├─ requirements.txt

│  └─ models/

│     ├─ savedmodel_libras/      # modelo TensorFlow (SavedModel)

│     └─ labels.txt              # mapeamento de classes

└─ frontend/

   ├─ index.html
   
   ├─ main.js

   ├─ style.css (opcional)
   
   └─ assets/
   
      └─ alfabeto_libras.png
      
▶️ Como Rodar no PC (passo a passo)

✅ Pré-requisitos

Python 3.10 ou 3.11 (recomendado)

Navegador: Chrome ou Edge

Webcam funcionando

Observação importante: o frontend usa câmera. O ideal é abrir o frontend por um servidor local (não apenas “clicando no arquivo”), para evitar bloqueios de permissões e problemas de CORS.

1) Rodar o Backend (Flask)

Abra um terminal na pasta do projeto e execute:

Windows (PowerShell)

Copiar código

Powershell

cd backend

python -m venv venv

.\venv\Scripts\activate

pip install -r requirements.txt

python server.py

Se estiver tudo ok, você verá algo como:  
rodando em: http://127.0.0.1:5000

✅ Teste rápido: abra no navegador

http://127.0.0.1:5000/health

Deve retornar JSON com "status":"ok" e "model_loaded": true.

3) Rodar o Frontend (recomendado)
   
Abra outro terminal na pasta frontend:

Powershell

cd frontend

python -m http.server 5500

Agora abra no navegador:

http://127.0.0.1:5500

Clique em Iniciar e permita a câmera.

4) (Alternativa) Abrir o index clicando no arquivo
   
Você pode abrir clicando em frontend/index.html, mas pode dar problemas de permissão de câmera dependendo do navegador.

✅ Se funcionar no seu PC, ótimo.

❗ Se bloquear câmera ou der erro de conexão, use o método recomendado com python -m http.server.

✅ Endpoints da API

GET /health

Verifica se o backend está online e se o modelo carregou.

POST /predict

Recebe um JSON com features (lista com 63 valores) e retorna a predição.

Exemplo de payload:

Copiar código

Json

{

  "features": [0.0, 0.1, 0.2, ... 63 valores ...]
  
}


⚠️ Limitações do Projeto

Reconhece somente as letras treinadas (subset)

Sensível a:

iluminação

distância da câmera

ângulo/posição da mão

Letras com gestos parecidos podem gerar confusão

Reconhecimento é de sinais estáticos (não interpreta movimento/gestos dinâmicos)

Não forma palavras automaticamente: é treino guiado (usuário adiciona a letra quando estiver correta)

✅ Principais Configurações do Frontend (main.js)

Alguns parâmetros que controlam a estabilidade do reconhecimento:

PREDICT_EVERY_MS — intervalo entre previsões

VOTE_WINDOW — janela de votos para estabilizar letra

MIN_ACCEPT_CONF — confiança mínima para aceitar a letra

MIN_HAND_SCORE — score mínimo para enviar a predição

🏋️ Projeto de Treino do Modelo (LIBRAS)

O Projeto de Treino é a base de aprendizado utilizada pelo LIBRAS Web.  

Nele foi desenvolvido todo o processo de coleta, preparação dos dados e treinamento do modelo de Machine Learning responsável por reconhecer as letras do alfabeto em LIBRAS.

 O que foi feito no projeto de treino:
 
- Captura manual dos landmarks da mão utilizando MediaPipe
- 
- Extração de 63 features por amostra (x, y, z de 21 pontos da mão)
- 
- Normalização dos dados para reduzir variações de posição e escala
- 
- Treinamento de um modelo TensorFlow/Keras para classificação das letras
- 
- Avaliação prática das letras com melhor desempenho
  
- Exportação do modelo final em SavedModel, utilizado no backend do projeto web

Observação importante

Nem todas as letras do alfabeto foram utilizadas.  

Foram selecionadas apenas as letras que apresentaram melhor taxa de acerto durante os testes, garantindo maior estabilidade no uso em tempo real.

🔗 O código completo do Projeto de Treino pode ser acessado neste repositório:  

👉 https://drive.google.com/file/d/1rZqpaJbsccNpyDS7vrbWES4Udh7zrbAk/view?usp=drive_link

Não foi possível upar o projeto no github devido erros

👨‍💻 Autor

Projeto desenvolvido para fins acadêmicos (Integração de Visão Computacional + ML + Web).
