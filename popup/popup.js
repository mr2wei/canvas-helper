document.addEventListener('DOMContentLoaded', function() {
    const coursesList = document.getElementById('courses-list');

    if (chrome.storage && chrome.storage.local) {
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
    } else {
        console.error('Browser extension APIs are not available.');
    }
});
