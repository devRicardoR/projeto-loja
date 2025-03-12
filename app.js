// Importando os módulos necessários
require('dotenv').config(); // Carrega as variáveis do arquivo .env
const express = require("express");  // Importa o módulo express, para criar o servidor e gerenciar as rotas
const fileupload = require("express-fileupload");  // Importa o módulo para lidar com uploads de arquivos
const mysql = require("mysql2");  // Importa o módulo mysql2, para interagir com o banco de dados MySQL
const { engine } = require("express-handlebars");  // Importa o motor de templates Handlebars
const fs = require('fs');  // Importa o módulo 'fs' para manipulação de arquivos do sistema

// Criando o app
const app = express();  // Cria uma instância do Express, que será o servidor

// Habilitando o upload de arquivos
app.use(fileupload({
  limits: { fileSize: 50 * 1024 * 1024 },  // Define um limite de 50MB para os arquivos
  abortOnLimit: true,  // Caso o arquivo ultrapasse o limite, a requisição será abortada
  responseOnLimit: "O tamanho do arquivo excede o limite permitido"  // Resposta que será enviada caso o limite seja ultrapassado
}));

// Adicionando o bootstrap
app.use("/bootstrap", express.static("./node_modules/bootstrap/dist"));  // Torna o Bootstrap disponível para o projeto, acessível pela URL '/bootstrap'

// Adicionando o css
app.use("/css", express.static("./css"))  // Torna os arquivos CSS disponíveis para o projeto, acessível pela URL '/css'

// Referenciando a pasta de imagens
app.use('/imagens', express.static('./imagens'));  // Torna a pasta de imagens acessível pela URL '/imagens'

// Configuração do express-handlebars
app.engine('handlebars', engine({
  helpers: {
    // Função auxiliar para verificar igualdade
    condicionalIgualdade: function (parametro1, parametro2, options) {
      return parametro1 === parametro2 ? options.fn(this) : options.inverse(this);
    }
  }
}));
app.set('view engine', 'handlebars');
app.set('views', './views');

// Configurando a manipulação de dados via rotas
app.use(express.json());  // Habilita o Express para lidar com requisições no formato JSON
app.use(express.urlencoded({ extended: true }));  // Habilita o Express para lidar com requisições de dados de formulários

// Configurando a conexão com banco de dados
const conexao = mysql.createConnection({
  host: process.env.DB_HOST,  // Endereço do servidor MySQL (do .env)
  user: process.env.DB_USER,  // Usuário para autenticação no banco de dados (do .env)
  password: process.env.DB_PASSWORD,  // Senha do banco de dados (do .env)
  database: process.env.DB_DATABASE  // Nome do banco de dados a ser utilizado (do .env)
});

// Teste de conexão
conexao.connect((erro) => {  // Tenta estabelecer a conexão com o banco de dados
  if (erro) {  // Caso haja um erro na conexão
    console.error("Erro ao conectar ao banco de dados:", erro.message);  // Exibe o erro no console
    return;  // Encerra a execução em caso de erro
  }
  console.log("Conexão efetuada com sucesso!");  // Se a conexão for bem-sucedida, exibe no console
});

// Rota Principal
app.get("/", (req, res) => {  // Rota GET para a página principal
  let sql = 'SELECT * FROM produtos';  // Query SQL para buscar todos os produtos
  conexao.query(sql, function (erro, retorno) {  // Executa a query no banco de dados
    if (erro) {  // Caso ocorra um erro
      console.error("Erro ao executar a query:", erro.message);  // Exibe o erro
      return;  // Encerra a execução em caso de erro
    }
    res.render("formulario", { produtos: retorno });  // Renderiza o template 'formulario' passando os produtos como variável
  });
});

// Rota Principal contendo a situação
app.get("/:situacao", (req, res) => {  // Rota com parâmetro de situação na URL
  let sql = 'SELECT * FROM produtos';  // Query SQL para buscar todos os produtos
  conexao.query(sql, function (erro, retorno) {  // Executa a query no banco de dados
    if (erro) {  // Caso ocorra um erro
      console.error("Erro ao executar a query:", erro.message);  // Exibe o erro
      return;  // Encerra a execução em caso de erro
    }
    res.render("formulario", { produtos: retorno, situacao: req.params.situacao });  // Renderiza o template 'formulario' passando produtos e a situação
  });
});

// Rota de cadastro
app.post('/cadastrar', function(req, res){
  try{
    // Obter os dados que serão utiliados para o cadastro
    let nome = req.body.nome;
    let valor = req.body.valor;
    let imagem = req.files.imagem.name;

    // Validar o nome do produto e o valor
    if(nome == '' || valor == '' || isNaN(valor)){
        res.redirect('/falhaCadastro');
    }else{
       // SQL
        let sql = `INSERT INTO produtos (nome, valor, imagem) VALUES ('${nome}', ${valor}, '${imagem}')`;
        
        // Executar comando SQL
        conexao.query(sql, function(erro, retorno){
            // Caso ocorra algum erro
            if(erro) throw erro;

            // Caso ocorra o cadastro
            req.files.imagem.mv(__dirname+'/imagens/'+req.files.imagem.name);
            console.log(retorno);
          });

       // Retornar para a rota principal
        res.redirect('/okCadastro');
    }
  }catch(erro){
    res.redirect('/falhaCadastro');
  }
});

// Rota para remover produtos
app.get('/remover/:codigo&:imagem', function (req, res) {  // Rota GET para remover um produto

  // Tratamento de exceção
  try{
    let sql = `DELETE FROM produtos WHERE codigo = ?`;  // Query SQL para deletar um produto
    conexao.query(sql, [req.params.codigo], function (erro, retorno) {  // Executa a query de remoção
      if (erro) {  // Caso ocorra um erro
        console.error("Erro ao executar a query:", erro.message);  // Exibe o erro
        return;  // Encerra a execução em caso de erro
      }
      // Remove a imagem do diretório de imagens
      fs.unlink(__dirname + '/imagens/' + req.params.imagem, (erro_imagem) => {
        if (erro_imagem) {
          console.error("Falha ao remover a imagem:", erro_imagem);  // Exibe o erro específico
        } else {
          console.log("Imagem removida com sucesso!");  // Exibe sucesso se a imagem for removida
        }
      });
    });
    res.redirect('/okRemover');  // Redireciona para a página principal após remover o produto
  }catch(erro){
    res.redirect('/falhaRemover')
  }
  
});

// Rota para redirecionar para o formulário de edição
app.get('/formularioEditar/:codigo', function (req, res) {  // Rota GET para exibir o formulário de edição
  let sql = `SELECT * FROM produtos WHERE codigo = ?`;  // Query SQL para buscar o produto pelo código
  conexao.query(sql, [req.params.codigo], function (erro, retorno) {  // Executa a query
    if (erro) {  // Caso ocorra um erro
      console.error("Erro ao executar a query:", erro.message);  // Exibe o erro
      return;  // Encerra a execução em caso de erro
    }
    res.render('formularioEditar', { produto: retorno[0] });  // Renderiza o template 'formularioEditar' passando o produto
  });
});

// Rota para editar produtos
app.post('/editar', function (req, res) {  // Rota POST para editar um produto
  // Obtém os dados do formulário de edição
  let nome = req.body.nome;
  let valor = req.body.valor;
  let codigo = req.body.codigo;
  let nomeImagem = req.body.nomeImagem;

  // Validar o nome do produto e valor
  if(nome == '' || valor == '' || isNaN(valor)){
    res.redirect('/falhaEdicao');
  }else{
    // Tenta realizar a edição incluindo a imagem
    try {
      let imagem = req.files.imagens;  // Obtém o arquivo de imagem enviado

      let sql = `UPDATE produtos SET nome = ?, valor = ?, imagem = ? WHERE codigo = ?`;  // Query SQL para atualizar o produto

      // Executa o comando SQL
      conexao.query(sql, [nome, valor, imagem.name, codigo], (erro, retorno) => {
        if (erro) {  // Caso ocorra um erro
          console.error("Erro ao executar a query:", erro.message);  // Exibe o erro
          return;  // Encerra a execução em caso de erro
        }
        // Remove a imagem antiga
        fs.unlink(__dirname + '/imagens/' + nomeImagem, (erro_imagem) => {
          console.log("Falha ao tentar remover a imagem!");
        });
        // Move a nova imagem para o diretório
        imagem.mv(__dirname + '/imagens/' + imagem.name);
      });
    } catch (erro) {  // Caso não haja imagem, realiza apenas a atualização dos dados do produto
      let sql = `UPDATE produtos SET nome = ?, valor = ? WHERE codigo = ?`;  // Query SQL para atualizar nome e valor
      conexao.query(sql, [nome, valor, codigo], (erro, retorno) => {
        if (erro) {  // Caso ocorra um erro
          console.error("Erro ao executar a query:", erro.message);  // Exibe o erro
          return;  // Encerra a execução em caso de erro
        }
      });
    }

    res.redirect('/okEdicao');  // Redireciona para a página principal após editar o produto
  };
});

// Iniciando o servidor
const PORT = process.env.PORT || 8080;  // Define a porta em que o servidor irá rodar (usa a porta do .env ou 8080 como padrão)
app.listen(PORT, () => {  // Inicia o servidor e escuta na porta definida
  console.log(`Servidor rodando na porta ${PORT}`);  // Exibe no console que o servidor está rodando
});