// preload.js

// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const fs = require('fs');
const { contextBridge } = require('electron');

const exchangeData = fs.readFileSync('resources/data/exchange-data.json', 'utf-8');
contextBridge.exposeInMainWorld('exchangeData', exchangeData);

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector)
        if (element) element.innerText = text
    }

    for (const dependency of ['chrome', 'node', 'electron']) {
        replaceText(`${dependency}-version`, process.versions[dependency])
    }
})