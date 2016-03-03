# Roy & Co GitHub Estimates

### Chrome Extension for GitHub
This extension provides the ability to set estimates for issues on GitHub by implementing a new menu in the sidebar.

### Known Bugs
- Any comment with the estimate data is read regardless of if the estimate data is the only thing in the comment
- Estimates sometimes break when creating (still shows properly on refresh, etc.)

### What is it?
The GitHub Estimates extension adds an extra feature to GitHub allowing you to set time estimates for projects via a menu in the sidebar. The system uses points to specify the time with each point being 15 minutes.

### How does it work?
The extension works by scanning an issue for a specially formatted issue which defines the estimate. If one is present, it sets the estimate and displays the time in the sidebar. To store the estimate, the extension creates a new comment and deletes all other comments with the correct format which is then displayed as an event to anyone who has the extension installed.

Furthermore, the extension also displays any estimates on the issues overview along with a total to give an idea on how long issues will take altogether.

### Development
To work on this extension, clone/fork this repository on your local machine and run `bower install` then go to chrome://extensions. On the extensions page, ensure "Developer mode" is turned on then click "Load unpacked extension..." and locate the folder for this extension. Any JS changes need to be reloaded via the "Reload" link on the extension's item.

### Icons
Icons can be changed in the icons/ directory. Other icon sizes can be set in manifest.json for example:
```json
"icons": {
	"32": "icons/icon32.png"
}
```
All icons should be square to support scaling by Chrome. The suggested sizes are: 16x16, 19x19, 32x32, 48x48 and 128x128 although a well-designed icon should scale well to all of these sizes from 128x128.
