const domain = window.location.origin;

isCanvasPage = async () => {
    let result = await new Promise((resolve, reject) => {
        chrome.storage.sync.get(['canvasDomain'], data => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError));
            } else {
                resolve(data);
            }
        });
    });

    if (result.canvasDomain && result.canvasDomain !== "") {
        if (domain.includes(result.canvasDomain)) {
            mainExtension();
        }
    } else {
        await setCanvasDomain();
    }
}

mainExtension = () => {
    console.log("Wei's Extension running!");

    // get classes and classesHash from chrome.storage.local
    chrome.storage.local.get(['classes', 'classesHash'], data => {
        if (chrome.runtime.lastError) {
            console.error('Error getting classes and classesHash:', chrome.runtime.lastError);
        } else {
            const { classes, classesHash } = data;
            if (classes && classesHash) {
                // if classes exist, check if classes is up to date
                console.log('Classes found, checking classes...');
                checkClasses(classesHash);
            } else {
                // if not, fetch classes
                console.log('Classes not found, fetching classes...');
                fetchClasses().then(classes => {
                    console.log('Classes fetched successfully.');
                    console.log('Classes: ', classes);
                    console.log('Classes type: ', typeof classes);

                    // set classes and classesHash
                    const classesString = JSON.stringify(classes);
                    hashJson(classesString).then(hash => {
                        chrome.storage.local.set({classes: classes, classesHash: hash}, () => {
                            if (chrome.runtime.lastError) {
                                console.error('Error setting classes and classesHash:', chrome.runtime.lastError);
                            } else {
                                console.log('Classes and classesHash saved successfully.');
                            }
                        });
                    });
                }).catch(error => {
                    console.error('Error fetching classes:', error);
                });
            }
        }
    });
}

setCanvasDomain = async () => {
    // test if current domain is a canvas domain
    let classes;
    try {
        classes = await fetchData(domain + '/api/v1/courses?enrollment_state=active&per_page=100');
    } catch (error) {
        // Handle network errors or other fetch issues
        console.error('Fetch error: ', error);
        return;
    }

    if (classes.errors) {
        // if not, ask user to set canvas domain
        console.log('Not canvas domain, will check again on next page load');
    } else if (!classes || classes.length === 0) {
        // Handle the case where there is no error but the response is empty or not as expected
        console.log('Received an unexpected response, possibly not a Canvas domain.');
    } else {
        // if yes, set canvas domain
        chrome.storage.sync.set({canvasDomain: domain}, () => {
            console.log('Canvas domain is set to ' + domain);
        });

        const classesString = JSON.stringify(classes);
        const hash = await hashJson(classesString);
        
        chrome.storage.local.set({classes: classes, classesHash: hash}, () => {
            if (chrome.runtime.lastError) {
                console.error('Error setting classes and classesHash:', chrome.runtime.lastError);
            } else {
                console.log('Classes and classesHash saved successfully.');
            }
        });
    }
}
checkClasses = async (storedClassesHash) => {
    // fetch classes
    let newClasses = await fetchClasses();

    // compare the hash of the fetched classes with the passed in classesHash
    const newClassesString = JSON.stringify(newClasses);
    const newHash = await hashJson(newClassesString);

    if (newHash !== storedClassesHash) {
        // if not equal, update classes and classesHash
        chrome.storage.local.set({classes: newClasses, classesHash: newHash}, () => {
            if (chrome.runtime.lastError) {
                console.error('Error setting classes and classesHash:', chrome.runtime.lastError);
            } else {
                console.log('Classes and classesHash updated successfully.');
            }
        });
    }
}
   
fetchClasses = async () => {
    try {
        const classes = await fetchData(domain + '/api/v1/courses?enrollment_state=active&per_page=100');
        if (classes.errors) {
            console.log('Received an unexpected response, possibly not a Canvas domain.');
            return null;
        } else {
            return classes;
        }
    } catch (error) {
        console.error('Fetch error: ', error);
        return null;
    }
}

fetchData = async (url) => {
    let response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });
    let data = await response.json();
    return data;
}

async function hashJson(jsonString) {
    const encoder = new TextEncoder();
    const data = encoder.encode(jsonString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
    return hashHex;
}

isCanvasPage();