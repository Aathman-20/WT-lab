# Standalone XML, DTD, and XSLT Demonstration

This folder is completely independent of the Node.js backend and MongoDB database.

## Files Included
- `students.xml` — Well-formed XML data containing student records.
- `students.dtd` — External Document Type Definition validating `students.xml`.
- `formatter.xsl` — XSLT 1.0 stylesheet that renders `students.xml` into a styled HTML table.

## How to View the Formatted XSLT Output on Windows
Modern browsers (Chrome, Edge, Firefox) block local `file://` XSLT stylesheets for security reasons (showing a blank page if double-clicked directly). Use either of these simple methods during your practical exam:

### Method 1: Serve with `npx http-server` (Recommended)
Open PowerShell or Command Prompt inside the `xml-demo/` directory and run:

    npx --yes http-server -p 8080 -c-1

Then open `http://localhost:8080/students.xml` in Chrome, Edge, or Firefox.

### Method 2: VS Code Live Server Extension
Right-click `xml-demo/students.xml` in Visual Studio Code and select **Open with Live Server**.