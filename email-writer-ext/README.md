manifest.json

--It is the most imp file and includes all the necessary information about the extension, such as its name, version, description, permissions, and other metadata. 

--The manifest.json file is essential for the proper functioning of the extension and is required for it to be recognized by the browser.

content.js

--includes all the logic of the button for the ext and how to call the api to generate reply based on the content


*we will need a observer to monitor our page when the compose or reply mail in gmail opens to add a  ai reply button--will use mutation observer for that basically