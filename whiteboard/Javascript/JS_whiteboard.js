var socket;
socket = io.connect();

socket.emit("mode-w", "whiteboard");

socket.on("imagedata", newDraw);
socket.on("stopdata", stopDraw);
socket.on("startDraw", startDraw);
socket.on("undo", undoS);
socket.on("clear", clear);
socket.on("checkCode", checkCode);
socket.on("getSession", (ses) => { session = ses; })

const canvas = document.getElementById("canvas");
var cs = document.getElementById("room");
var js = document.getElementById("join-session");
js.value = "";
 
let context = canvas.getContext("2d"); //crea un oggetto che definisce le proprietà per disegnare
let initial_background_color = "white";
context.fillStyle = initial_background_color;
context.fillRect(0, 0, canvas.width, canvas.height); //metodo che ti permette di disegnare su un rettangolo riempito in posizione x e y
 
let draw_color = "black";
let draw_width = "3";
let is_drawing = false;
let haveSession = false;
var session = "";

let drawer = true;
 
let array_path = [];
let index = -1; //si parte da -1 perché 0 significherebbe che c'è già un path dentro
 
//sezione touchEvents: touchstart indica un nuovo tocco sulla superficie "touch"
//touchmove indica lo spostamento effettuato sulla superficie touch
//mousedown indica l'inzio del disegno (viene effettuato il controllo su is_drawning che dovrà essere true)
//mousemove indica lo spostamento del disegno. di default lo spessore della linea è sempre 1 ed è nero
//le funzioni touch funzionano su mobile, mentre le mouse sono indicate per pc
canvas.addEventListener("touchstart", start, false);
canvas.addEventListener("touchmove", draw, false);
canvas.addEventListener("mousedown", start, false);
canvas.addEventListener("mousemove", draw, false);
 
canvas.addEventListener("touchend", stop, false);
canvas.addEventListener("mouseup", stop, false);
canvas.addEventListener("mouseout", stop, false);

js.addEventListener("keyup", (event)=>{ if(event.key == "Enter" ) joinSession(); });

function start(event) {
    if(!drawer) return;
    is_drawing = true; //condizione necessaria affiché si attivi l'evento desiderato
    context.beginPath(); //crea un nuovo percorso svuotando l'elenco dei sottopercorsi
    context.moveTo(event.clientX + canvas.parentNode.scrollLeft + canvas.parentNode.parentNode.parentNode.scrollLeft - canvas.offsetLeft,
                   event.clientY + canvas.parentNode.scrollTop + canvas.parentNode.parentNode.parentNode.scrollTop - canvas.offsetTop);
    event.preventDefault();//toglie le impostazioni di default

    socket.emit("startDraw", {x: event.clientX + canvas.parentNode.scrollLeft + canvas.parentNode.parentNode.parentNode.scrollLeft - canvas.offsetLeft, 
        y: event.clientY + canvas.parentNode.scrollTop + canvas.parentNode.parentNode.parentNode.scrollTop - canvas.offsetTop});
}


 
function draw(event) {
    if(!drawer) return;
    if(is_drawing){
        context.lineTo(event.clientX + canvas.parentNode.scrollLeft + canvas.parentNode.parentNode.parentNode.scrollLeft - canvas.offsetLeft,
                       event.clientY + canvas.parentNode.scrollTop + canvas.parentNode.parentNode.parentNode.scrollTop - canvas.offsetTop); //deve tracciare una linea lungo l'asse in cui sposto il mouse (premuto)
        context.strokeStyle = draw_color; //definisce il colore della linea (in questo caso nero)
        context.lineWidth = draw_width; //definisce lo spessore della linea (di default 1, ma in questo caso sarà 3)
        context.lineCap = "round"; //definisce la forma della linea
        context.lineJoin = "round"; //definisce la forma utilizzata per unire due segmenti nel punto in cui si incontrano.
        context.stroke(); //funzione che traccia il percorso indicato con lo stile precedentemente impostato
        

        msg = {
            x: event.clientX + canvas.parentNode.scrollLeft + canvas.parentNode.parentNode.parentNode.scrollLeft - canvas.offsetLeft,
            y: event.clientY + canvas.parentNode.scrollTop + canvas.parentNode.parentNode.parentNode.scrollTop - canvas.offsetTop, 
            color: draw_color, 
            w: draw_width, 
            cap: "round", 
            join: "round"
        }
        socket.emit("imagedata", msg);
    }
    event.preventDefault();
}
 
function stop(event) {
    if(!drawer) return;
    if(is_drawing) {

        socket.emit("stopdata");

        context.stroke();
        context.closePath(); //fine del percorso
        is_drawing = false;
    }
    event.preventDefault();
 
    if(event.type != 'mouseout'){
        array_path.push(context.getImageData(0, 0, canvas.width, canvas.height));
        index += 1;
        
    /*    
        if(haveSession == true) socket.emit("updateState", array_path[index]);
        console.log(array_path[index]); */
    }
}
 
function change_color(element) { //funzione per cambiare colore
    if(!drawer) return;
    draw_color = element;
    //ogni pallino colorato ha un attributo onClick associato
    //una volta clickato il pallino con il colore desiderato, il tratto disegnato assumerà il colore del
    //background associato al pallino scelto
}
 
//per le funzioni color picker e incremento del tratto, basta aggiungere un onInput e assegnare il valore di 
//draw_color e draw_width a valori variabili
 
 
function clear_canvas(){ //una volta premuto il tasto clear, il background torna al suo stato iniziale
    if(!drawer) return;
    context.fillStyle = initial_background_color;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillRect(0, 0, canvas.width, canvas.height);
    //reinizializziamo tutto
 
    array_path = [];
    index = -1;

    socket.emit("clear");
}
 
//per questa funzione è necessario l'ausilio di array_path che tiene traccia di tutti 
//i cambiamenti effettuati durante la fase di modifica della canvas
function undo() {
    if(!drawer) return;
    if(index <= 0){ // non c'è niente nell'array_path
        clear_canvas(); 
    } 
    else{
        index -= 1;
        array_path.pop(); 
        context.putImageData(array_path[index], 0, 0); //ritorniamo il contenuto nella sua versione prima della modifica
    }
    socket.emit("undo");
}

function undoS() {
    if(index <= 0){ // non c'è niente nell'array_path
        clear_canvas(); 
    } 
    else{
        index -= 1;
        array_path.pop(); 
        context.putImageData(array_path[index], 0, 0); //ritorniamo il contenuto nella sua versione prima della modifica
    }
}

function clear(){ 
    context.fillStyle = initial_background_color;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillRect(0, 0, canvas.width, canvas.height);
 
    array_path = [];
    index = -1;
}

function newDraw(msg) {
    
    
    context.lineTo(msg.x, msg.y); //deve tracciare una linea lungo l'asse in cui sposto il mouse (premuto)
    context.strokeStyle = msg.color; //definisce il colore della linea (in questo caso nero)
    context.lineWidth = msg.w; //definisce lo spessore della linea (di default 1, ma in questo caso sarà 3)
    context.lineCap = msg.cap; //definisce la forma della linea
    context.lineJoin = msg.join; //definisce la forma utilizzata per unire due segmenti nel punto in cui si incontrano.
    context.stroke();
}

function stopDraw() {    
    array_path.push(context.getImageData(0, 0, canvas.width, canvas.height));
    index += 1;
}

function startDraw(data) {
    context.beginPath();
    context.moveTo(data.x, data.y);
}



function createSession() { console.log("CIAO");
    socket.emit("createSession");
    cs.setAttribute("style", "display:none");
 //   js.setAttribute("style", "display:none");
    clear_canvas();
    haveSession = true;
    setTimeout(function(){
        js.value = "ID session: " + session;
        js.disabled = true;
        js.setAttribute("style", "cursor: default; width: 11em")
    }, 200);
}
function joinSession() {
    clear_canvas();
    socket.emit("joinSession", document.getElementById("join-session").value);
}

function checkCode(check) {
    if (check == 0) {
        js.value = "";
        return;
    }
    cs.setAttribute("style", "display:none");
 //   js.setAttribute("style", "display:none");
    haveSession = true;
    session = check;
    setTimeout(function(){
        js.value = "ID session: " + session;
        js.disabled = true;
        js.setAttribute("style", "cursor: default; width: 11em")
    }, 200);
}
