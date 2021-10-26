var express = require("express");
var socket = require("socket.io");
var fs = require("fs");
var path = require('path');
var bodyParser = require("body-parser");
const { Session } = require("inspector");

var app = express();


app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('whiteboard'));

var server = app.listen(8080);
var io = socket(server,{
    cors: {
            origin: "http://localhost",
            methods: ["GET", "POST"],
            credentials: true,
            transports: ['websocket', 'polling'],
    },
    allowEIO3: true
});

console.log("WhiteBoard is sharing...");
io.sockets.on("connection", newConnection);

var list;
var clients = [];
var index = 0;
var chars = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "O", "P", "Q", "R", 
        "S", "T", "U", "W", "X", "Y", "Z", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "I"];

var sessions = {
    num: [],
    index: 0,
    new: (number, id) => {
        sessions.num[sessions.index] = {
            code: number,
            index: 1,
            answer: "LORIANA",
            checkStart: false,
            state: 0,
            partecipants: [id]
        }
        sessions.index++;
 //       console.log(sessions.num);
    },
    join: (number, id) => {
        sessions.num.forEach(element => {
            if (element.code == number) {
                element.partecipants[element.index] = id;
                element.index++;
            }
        });
    },
    del: (number) => {
        for (var i = 0, found = 0; i < sessions.num.length; i++) {
            if (found == 1) { 
                sessions.num[i - 1].num = sessions.num[i].num;
                sessions.num[i - 1].index = sessions.num[i].index;
                sessions.num[i - 1].partecipants = sessions.num[i].partecipants;
            }
            if (sessions.num[i].code == number) { found = 1; sessions.index --; }
        }
    },
    removeMember: (number, id) => {
        for(var i = 0; i < sessions.num.length; i++) {
            if (sessions.num[i].code == number){
                for(var j = 0, found = 0; j < sessions.num[i].partecipants.length; j++) {
                    if (found == 1) sessions.num[i].partecipants[j - 1] = sessions.num[i].partecipants[j];
                    if (id == sessions.num[i].partecipants[j]) { found = 1; sessions.num[i].index --; }
                }
                if (sessions.num[i].partecipants.length == 0) sessions.del(number);
            }
            break;
        }
    },
    getByNum: (number) => {
        for(var i = 0; i < sessions.num.length; i++) {
            if (sessions.num[i].code == number) return sessions.num[i];
        }
        return 0;
    }
};

var nickname = " ";

app.post('/Index_Game.html', function (req, res) {
    nickname = req.body.nickname;
    res.sendFile(path.join(__dirname, './whiteboard/Index_Game.html'));
});

fs = fs.readFile("dizionario.txt", "utf8", function(err, data){
    list = data;})

setTimeout(function(){
    list = list.split("\n");
}, 2000);

function newConnection(socket) {
    var rooms;
    var session;
    
    socket.on("imagedata", imagedataMsg);
    socket.on("stopdata", stop);
    socket.on("startDraw", start);
    socket.on("undo", undo);
    socket.on("clear", clear);
    socket.on("newMessage", newMessage);
    socket.on("newGame", newGame);
    socket.on("mode-w", modeW);
    socket.on("mode-g", modeG);
    socket.on("createSession", createSession);
    socket.on("joinSession", joinSession);
    socket.on("updateState", updateState);
    socket.on("disconnect", disc);

    function modeW(mode) {
        socket.join(socket.id + "SESSION");
        rooms = socket.rooms.entries();
        rooms.next();
        session = rooms.next().value[1];
    }

    function modeG(mode) {
        socket.leave(socket.id + "SESSION");
        socket.join(socket.id + "SESSION");
        rooms = socket.rooms.entries();
        rooms.next();
        session = rooms.next().value[1];
        
        clients[index] = { id: socket.id, name: nickname };
        index++;
        nickname = " ";
        io.sockets.to(socket.id).emit("setName", clients[index - 1].name);
    }

    function createSession() {
        var sesNumber = '';
        for (var i = 0; i < 8; i++) sesNumber += chars[Math.floor(Math.random() * chars.length)];
        io.sockets.to(socket.id).emit("createSession", sesNumber);
        socket.leave(socket.id + "SESSION");
        socket.join(sesNumber);
        sessions.new(sesNumber, socket.id);
        session = sesNumber;

        io.sockets.to(socket.id).emit("getSession", session);
 //       console.log(sesNumber);
    }

    function joinSession(sesNumber) {
        if (sessions.getByNum(sesNumber) == 0) {
            io.sockets.to(socket.id).emit("checkCode", 0);
            return;
        }
        else io.sockets.to(socket.id).emit("checkCode", sesNumber);
        socket.leave(socket.id + "SESSION");
        socket.join(sesNumber);
        sessions.join(sesNumber, socket.id);
        session = sesNumber;
        io.sockets.to(socket.id).emit("checkGame", {check: sessions.getByNum(session).checkStart, 
                                                    ans: sessions.getByNum(session).answer,
                                                    state: sessions.getByNum(session).state});
    }

    function updateState(image) {
        sessions.getByNum(session).state = image;
//        console.log(sessions.getByNum(session).state);
    }

    function stop() {
        socket.broadcast.to(session).emit("stopdata");
    }

    function imagedataMsg(imagedata) {
        socket.broadcast.to(session).emit("imagedata", imagedata);
    }

    function start(data) {
        socket.broadcast.to(session).emit("startDraw", data);
    }

    function undo() {
        socket.broadcast.to(session).emit("undo");
    }

    function clear() {
        socket.broadcast.to(session).emit("clear");
    }

    function newMessage(message) {
        if (message.text == "LORIANA" & sessions.getByNum(session).answer == "LORIANA") message.text = "Ci sono due coccodrilli...";
        else if (message.text == sessions.getByNum(session).answer) { winner(); message.text = "RISPOSTA ESATTA: " + message.text; }
        io.in(session).emit("newMessage", message);
    }

    function newGame() {
        sessions.getByNum(session).checkStart = true;
        sessions.getByNum(session).answer = list[Math.floor(Math.random() * list.length)];
        
        var msg = {
            id: sessions.getByNum(session).partecipants[Math.floor(Math.random() * sessions.getByNum(session).index)],
            ans: sessions.getByNum(session).answer,
            state: 0
        }
        
        io.in(session).emit("newGame", msg);
        io.in(session).emit("clear");
    }

    function winner() {
        io.sockets.to(session).emit("winner");
        sessions.getByNum(session).answer = "LORIANA";
        sessions.getByNum(session).checkStart = false;
    }

    function disc() {
        for (let i = 0, found = 0; i < clients.length; i++) {
            if (found == 1) clients[i - 1].id = clients[i].id;
            if (socket.id == clients[i].id) { found = 1; index --; }
        }

        sessions.removeMember(session, socket.id);
    }
}
