import React, { useState, useEffect } from 'react';
import browser from 'webextension-polyfill';

export default function Home() {
    const [courses, setCourses] = useState(null);

    useEffect(() => {
        if (typeof browser !== 'undefined' && browser.storage) {
            browser.storage.local.get('classes').then((result) => {
                setCourses(result.classes);
                console.log('Loaded courses from storage:', result.classes);
            }).catch((error) => {
                console.error('Error accessing storage:', error);
            });
        } else {
            console.error('Browser extension APIs are not available.');
        }
    }, []);

    return (
        <div>
        <h1>Home</h1>
        <h3>Courses:</h3>
        <ul>
            {courses && courses.map((course) => {
                return <li key={course.id}>{course.name}</li>
            })}
        </ul>
        </div>
    );

}