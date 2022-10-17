

const peer = new Peer(`${Math.floor(Math.random() * 2 ** 18)}`, {
    host: location.hostname,
    debug: 1,
    port : 8000,
    path: '/myapp'
});

window.peer = peer
let conn
const recieveBtn = document.getElementById('recieve-btn');
let sendBtn = document.getElementById('send-btn');
let input = document.getElementById('file-input');
let files



peer.on('open', function(id) {

    document.getElementById("idField").innerText = id
});

input.addEventListener('change', (e) => {
   files = e.target.files;
})

// async function dataUrlToFile(dataUrl, fileName) {

//     const res = await fetch(dataUrl);
//     const blob = await res.blob();
//     return new File([blob], fileName, { type: 'image/png' });
// }

let recievedFiles = {}
let tmpFileName = ""
let fileChunks = {}
let totalChunks

function alignChunks(filename){
    let i = 1
    let tmpArr = []

    while(fileChunks[filename][i]){
        // console.log("In while loop ",i + " ", fileChunks[filename][i])
        tmpArr.push(fileChunks[filename][i])
        i+=1
    }

    return tmpArr

}

let progressBar = document.getElementById("progress-bar")

recieveBtn.addEventListener('click', () => {

    // conn = peer.connect(window.prompt("Enter the Sender's Share ID : "))
    // console.log(document.getElementById("shareID").value.toString())
    let recBox = document.getElementById("recieveBox")
    let headsUp = document.createElement('p')
    headsUp.innerText = "The Files will start downloading automatically once they are recieved."
    recBox.appendChild(headsUp)
    conn = peer.connect(document.getElementById("shareID").value.toString())
    

    conn.on('open', function() {
        addStatus("Connection Established", "text-success")
        conn.on('data', async function(data) {
            
        
        if (data.length === 4){ // conn.send([file.name, file.size, totalChunks, chunkSize])
                tmpFileName = data[0]
                let kbs = Math.fround(data[1]/1024).toFixed(2)
                addStatus(`${data[0]} of Size ${kbs}KB with totalChunks : ${data[2]}`, "text-primary")
                totalChunks = data[2]
                fileChunks[data[0]] = {}

            }
            else if (data.length === 3){ // conn.send([chunk, file.name, currentChunk])
                // fileChunks[data[1]].push(data[0])
                let current = data[2]
                fileChunks[data[1]][data[2]] = data[0]
                // console.log(Math.ceil((current / totalChunks) * 100))
                progressBar.style.width = Math.ceil((current / totalChunks) * 100) + "%"
                progressBar.innerText = Math.ceil((current / totalChunks) * 100) + "%"
            
            } else if (data[0] === "File Done"){
                // console.log(fileChunks)

                let tmpArr = alignChunks(data[1])
                // const file = new Blob(fileChunks[data[1]]);
                const file = new Blob(tmpArr);
                let url = URL.createObjectURL(file);

                addStatus('Recieved ' + tmpFileName, "text-success") //, file);

                let link = window.document.createElement('a');
                link.href = url
                link.download = tmpFileName;

                document.body.appendChild(link);
                link.click();

            }


        });
    })
})

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

const chunkAndUpload = async (file) => {
    const chunkSize = 10 * 1024
    let chunkArray = []
    addStatus(`${file.name} converting to arrayBuffer`, "text-secondary")
    file.arrayBuffer().then(buffer =>{

        addStatus(`${file.name} finished converting to arrayBuffer. Started Transfer`, "text-secondary")

        let totalChunks = Math.ceil(buffer.byteLength / chunkSize)
        let currentChunk = 1
        conn.send([file.name, file.size, totalChunks, chunkSize])
        while(buffer.byteLength){
            let chunk = buffer.slice(0, chunkSize)
            buffer = buffer.slice(chunkSize, buffer.byteLength)

            conn.send([chunk, file.name, currentChunk])
            currentChunk += 1

        }
        conn.send(["File Done", file.name])
    })
    

}

let statusField = document.getElementById("status-messages")

const addStatus =(message, color)=>{

    let msg = window.document.createElement('h5');
    msg.innerText = message
    statusField.appendChild(msg)
    msg.classList.add(color);

}

sendBtn.addEventListener('click', async () => {

    addStatus("Waiting for connection.. Enter Your Share ID on reciever's end", "text-secondary")
    try {
        await makeConn()
    } catch(e) {
        console.log(e);
    }


    conn.on('open', async function()  {

        for (let file of files){

            await chunkAndUpload(file)
            // let base64str = await toBase64(file)
            // conn.send(base64str)
            addStatus(`${file.name} Started Uploading`, "text-success")

        }
        conn.send("All Files Sent")
    });
    

    addStatus('All files sent successfully', "text-success")
})


const makeConn = () => new Promise((resolve, reject)=> {

    peer.on('connection', function(connObj) {
        conn = connObj;
        addStatus("Connection Established")
        if (conn){
            resolve("resolved")
        } else {
            reject( new Error("Connection not yet established"))
        }
    });

})
