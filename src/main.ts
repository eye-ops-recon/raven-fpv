const info = document.querySelector("#stick");
if(info == null){
    throw new Error("couldn't find id = #stick");
}

const pad = document.querySelector<HTMLDivElement>("#pad");
if(pad == null){
    throw new Error("couldn't find id = #pad");
}

pad.addEventListener("pointermove", (e) =>{
    const rect = pad.getBoundingClientRect();

    info.textContent = (1 - (e.clientY - rect.top) / rect.height ).toString();
})  