function loadData() {
    const coursesList = document.getElementById('courses-list');
    coursesList.innerHTML = ''; // Clear existing items

    chrome.storage.local.get('classes', function(result) {
        const courses = result.classes;
        console.log('Loaded courses from storage:', courses);

        if (courses) {
            courses.forEach(course => {
                const listItem = document.createElement('li');
                listItem.textContent = course.name;
                listItem.setAttribute('key', course.id);
                coursesList.appendChild(listItem);
            });
        } else {
            console.log('No courses found in storage.');
        }
    });

    const assignmentsList = document.getElementById('assignments-list');
    assignmentsList.innerHTML = ''; // Clear existing items

    const announcementsList = document.getElementById('announcements-list');
    announcementsList.innerHTML = ''; // Clear existing items

    chrome.storage.local.get('plannable', function(result) {
        const plannableItems = result.plannable;
        console.log('Loaded plannable items from storage:', plannableItems);

        if (plannableItems) {
            // Process assignments and quizzes
            const assignmentAndQuizItems = plannableItems
                .filter(item => item.plannable_type === 'assignment' || item.plannable_type === 'quiz')
                .sort((a, b) => new Date(a.plannable.due_at) - new Date(b.plannable.due_at));

            if (assignmentAndQuizItems.length > 0) {
                assignmentAndQuizItems.forEach(item => {
                    const listItem = document.createElement('li');
                    listItem.textContent = item.plannable.title || item.plannable.name || 'No Title';
                    listItem.setAttribute('key', item.plannable.id);
                    assignmentsList.appendChild(listItem);
                });
            } else {
                const listItem = document.createElement('li');
                listItem.textContent = 'No assignments or quizzes';
                assignmentsList.appendChild(listItem);
            }

            // Process announcements
            const announcementItems = plannableItems.filter(item => item.plannable_type === 'announcement');
            if (announcementItems.length > 0) {
                announcementItems.forEach(item => {
                    const listItem = document.createElement('li');
                    listItem.textContent = item.plannable.title || item.plannable.name || 'No Title';
                    listItem.setAttribute('key', item.plannable.id);
                    announcementsList.appendChild(listItem);
                });
            } else {
                const listItem = document.createElement('li');
                listItem.textContent = 'No announcements';
                announcementsList.appendChild(listItem);
            }
        } else {
            console.log('No plannable items found in storage.');
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    loadData();

    document.getElementById('refresh-button').addEventListener('click', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs.length > 0) {
                const tab = tabs[0];
                console.log('Active tab URL:', tab.url);

                // Get the Canvas domain from storage
                chrome.storage.sync.get(['canvasDomain'], function(data) {
                    const canvasDomain = data.canvasDomain;
                    if (canvasDomain && tab.url.includes(canvasDomain)) {
                        // Send message to content script
                        chrome.tabs.sendMessage(tab.id, { action: 'refreshData' }, function(response) {
                            if (chrome.runtime.lastError) {
                                console.error('Error:', chrome.runtime.lastError.message);
                            } else {
                                console.log(response.status);
                                // After data is refreshed, reload the data in the popup
                                loadData();
                            }
                        });
                    } else {
                        // Inform the user to navigate to the Canvas site
                        alert('Please navigate to your Canvas site and try refreshing again.');
                    }
                });
            } else {
                console.error('No active tab found.');
            }
        });
    });
});
