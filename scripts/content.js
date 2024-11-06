const domain = window.location.origin;
console.log('Content script loaded on:', window.location.href);

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
    console.log("Extension running!");

    // get classes, classesHash, plannable, and plannableHash from chrome.storage.local
    chrome.storage.local.get(['classes', 'classesHash', 'plannable', 'plannableHash'], data => {
        if (chrome.runtime.lastError) {
            console.error('Error getting data from storage:', chrome.runtime.lastError);
        } else {
            const { classes, classesHash, plannable, plannableHash } = data;
            
            // Check and fetch classes
            if (classes && classesHash) {
                console.log('Classes found, checking classes...');
                checkClasses(classesHash);
            } else {
                console.log('Classes not found, fetching classes...');
                fetchClasses().then(classes => {
                    console.log('Classes fetched successfully.');
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

            // Check and fetch plannable
            if (plannable && plannableHash) {
                console.log('Plannable found, checking plannable...');
                checkPlannable(plannableHash);
            } else {
                console.log('Plannable not found, fetching plannable...');
                fetchPlannable().then(plannable => {
                    console.log('Plannable fetched successfully.');
                    const plannableString = JSON.stringify(plannable);
                    hashJson(plannableString).then(hash => {
                        chrome.storage.local.set({plannable: plannable, plannableHash: hash}, () => {
                            if (chrome.runtime.lastError) {
                                console.error('Error setting plannable and plannableHash:', chrome.runtime.lastError);
                            } else {
                                console.log('Plannable and plannableHash saved successfully.');
                            }
                        });
                    });
                }).catch(error => {
                    console.error('Error fetching plannable:', error);
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

checkPlannable = async (storedPlannableHash) => {
    // fetch plannable items
    let newPlannable = await fetchPlannable();

    // compare the hash of the fetched plannable items with the passed in plannableHash
    const newPlannableString = JSON.stringify(newPlannable);
    const newHash = await hashJson(newPlannableString);

    if (newHash !== storedPlannableHash) {
        // if not equal, update plannable and plannableHash
        chrome.storage.local.set({plannable: newPlannable, plannableHash: newHash}, () => {
            if (chrome.runtime.lastError) {
                console.error('Error setting plannable and plannableHash:', chrome.runtime.lastError);
            } else {
                console.log('Plannable and plannableHash updated successfully.');
            }
        });
    }
}

fetchPlannable = async () => {
    try {
        const currentDate = new Date().toISOString();
        const plannable = await fetchData(domain + '/api/v1/planner/items?start_date=' + encodeURIComponent(currentDate) + '&per_page=75');
        if (plannable.errors) {
            console.log('Received an unexpected response, possibly not a Canvas domain.');
            return null;
        } else {
            return plannable;
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

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Content script received message:', request);
    if (request.action === 'refreshData') {
        (async () => {
            try {
                // Fetch and store classes
                const classes = await fetchClasses();
                const classesString = JSON.stringify(classes);
                const classesHash = await hashJson(classesString);
                await new Promise((resolve, reject) => {
                    chrome.storage.local.set({ classes: classes, classesHash: classesHash }, () => {
                        if (chrome.runtime.lastError) {
                            console.error('Error setting classes and classesHash:', chrome.runtime.lastError);
                            reject(chrome.runtime.lastError);
                        } else {
                            console.log('Classes and classesHash saved successfully.');
                            resolve();
                        }
                    });
                });

                // Fetch and store plannable items
                const plannable = await fetchPlannable();
                const plannableString = JSON.stringify(plannable);
                const plannableHash = await hashJson(plannableString);
                await new Promise((resolve, reject) => {
                    chrome.storage.local.set({ plannable: plannable, plannableHash: plannableHash }, () => {
                        if (chrome.runtime.lastError) {
                            console.error('Error setting plannable and plannableHash:', chrome.runtime.lastError);
                            reject(chrome.runtime.lastError);
                        } else {
                            console.log('Plannable and plannableHash saved successfully.');
                            resolve();
                        }
                    });
                });

                sendResponse({ status: 'Data refreshed' });
            } catch (error) {
                console.error('Error refreshing data:', error);
                sendResponse({ status: 'Error refreshing data' });
            }
        })();
        return true; // Keep the message channel open for sendResponse
    }
});

isCanvasPage();
