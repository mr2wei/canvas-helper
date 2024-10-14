import axios from 'axios';

export async function getCourses(){
    // get from chrome.storage.local
    let classes = await new Promise((resolve, reject) => {
        chrome.storage.local.get(['classes'], data => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError));
            } else {
                resolve(data.classes);
            }
        });
    });
    return classes;
}