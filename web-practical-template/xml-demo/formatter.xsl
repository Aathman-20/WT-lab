<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <!-- CHANGE HERE: Update the XSLT output report title. -->
        <title>Student Directory — XML/XSLT Report</title>
        <style>
          /* CHANGE HERE: Customize XSLT report colors (white, black, grey and green). */
          body {
            font-family: Arial, Helvetica, sans-serif;
            background-color: #F5F5F5;
            color: #212121;
            margin: 0;
            padding: 32px 20px;
          }
          .report-wrapper {
            max-width: 960px;
            margin: 0 auto;
            background-color: #FFFFFF;
            border: 1px solid #BDBDBD;
            border-radius: 6px;
            padding: 24px;
            
          }
          h1 {
            margin: 0 0 6px 0;
            font-size: 1.4rem;
            color: #212121;
          }
          p.subtitle {
            margin: 0 0 20px 0;
            color: #616161;
            font-size: 0.92rem;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.92rem;
          }
          th, td {
            text-align: left;
            padding: 11px 12px;
            border-bottom: 1px solid #BDBDBD;
          }
          th {
            background-color: #EEEEEE;
            color: #616161;
            text-transform: uppercase;
            font-size: 0.8rem;
            letter-spacing: 0.03em;
          }
          tr:hover {
            background-color: #F5F5F5;
          }
          .badge {
            display: inline-block;
            padding: 3px 8px;
            background-color: #E8F5E9;
            color: #1B5E20;
            border: 1px solid #2E7D32;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 600;
          }
          .summary-footer {
            margin-top: 16px;
            font-size: 0.88rem;
            color: #616161;
          }
        </style>
      </head>
      <body>
        <div class="report-wrapper">
          <!-- CHANGE HERE: Update report header text for the new scenario. -->
          <h1>Student Academic Registry (XML + DTD + XSLT Demonstration)</h1>
          <p class="subtitle">Formatted automatically from students.xml using formatter.xsl</p>

          <table>
            <thead>
              <!-- CHANGE HERE: Update table headers to match the XML fields. -->
              <tr>
                <th>Record ID</th>
                <th>Roll Number</th>
                <th>Student Name</th>
                <th>Department</th>
                <th>Official Email</th>
                <th>Year</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <!-- CHANGE HERE: Update XPath expression and xsl:value-of field selections. -->
              <xsl:for-each select="students/student">
                <xsl:sort select="rollNo" order="ascending"/>
                <tr>
                  <td><xsl:value-of select="@id"/></td>
                  <td><strong><xsl:value-of select="rollNo"/></strong></td>
                  <td><xsl:value-of select="name"/></td>
                  <td><xsl:value-of select="department"/></td>
                  <td><xsl:value-of select="email"/></td>
                  <td>Year <xsl:value-of select="year"/></td>
                  <td>
                    <span class="badge">
                      <xsl:value-of select="@status"/>
                    </span>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>

          <div class="summary-footer">
            Total XML Records Displayed: <strong><xsl:value-of select="count(students/student)"/></strong>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>