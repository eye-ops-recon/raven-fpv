import { clamp } from "./math/clamp";

const edgeMargin = 0.03;

const info = document.querySelector("#stick");
if(info === null){
    throw new Error("couldn't find id = #stick");
}

const pad = document.querySelector<HTMLDivElement>("#pad");
if(pad === null){
    throw new Error("couldn't find id = #pad");
}


pad.addEventListener("pointermove", (e) =>{
    const rect = pad.getBoundingClientRect();
    const output = (1 - (e.clientY - rect.top) / rect.height );
    const remapedOutput = (output - edgeMargin) * (1 / (1 - edgeMargin*2));
    const clampOutput = clamp(remapedOutput, 0, 1);

    info.textContent = clampOutput.toString();
})  