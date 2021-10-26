drawer = true;

socket.emit("mode-g", "game");

var nickname = "Dr.Culocane";

var start = document.getElementById("start-button");
var word = document.getElementById("input-field");

const Chat = {
    result:  document.getElementById("output"),
    sendButton: document.querySelector("#send-button"),
    inputText: document.getElementById("input-field"),


 
    chatMessage: function(message){
        const $inputText = this.inputText;
        var b = 0;
 
        if(message){
            //const $nuovoSpazio = document.createElement("span");
            const $nuovoParagrafo = document.createElement("p");
            const $nuovoGrassetto = document.createElement("b");
            $nuovoGrassetto.setAttribute("id" , "attach");
 
            $nuovoGrassetto.innerHTML = message.name + ": " + message.text;
            $nuovoParagrafo.appendChild($nuovoGrassetto);

            this.result.appendChild($nuovoParagrafo);
        }
 
    },
 
    init: function(){ 
        this.inputText.value = "";

        this.inputText.addEventListener("keyup", (event) =>{ 
            var msg = {
                text: this.inputText.value,
                name: nickname
            }
            if(event.key == "Enter" & this.inputText.value != "") {
                socket.emit("newMessage", msg);
                this.inputText.value = "";
            } })
    }
};

start.addEventListener("click", ()=>{
    socket.emit("newGame");
    start.setAttribute("style", "display:none");
})

socket.on("newMessage", (message) => {Chat.chatMessage(message)});
socket.on("newGame", newGame);
socket.on("winner", winner);
socket.on("setName", setName);
socket.on("checkGame", checkGame);

function checkGame(bool) {
    if (bool.check) {
        newGame({id: " ", ans: bool.ans, state: bool.state})
        word.disabled = true;
        word.setAttribute("placeholder", "Wait next turn");
    }
}

function setName(name) {
    if (name != " ") nickname = name;
}

function newGame(id) {
    console.log(id.id);
    if (id.id == socket.id) {
        word.disabled = true;
        word.value =  id.ans;
        word.setAttribute("style", "color: rgb(5,168,54); font-size: larger; text-align: center;");
    }
    else drawer = false;
    start.setAttribute("style", "display:none");
    if(id.state != 0) context.putImageData(id.state, 0, 0);
}

function winner() {
    start.setAttribute("style", "");
    drawer = true;
    word.disabled = false;
    word.value =  "";
    word.setAttribute("style", "color: black; font-size: medium; text-align: none");
    word.setAttribute("placeholder", "Type some text...");
}

Chat.init();