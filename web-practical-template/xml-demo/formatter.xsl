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
          /* CHANGE HERE: Customize XSLT report colors (Warm neutral palette; no blue/purple). */
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #F7F4EE;
            color: #262522;
            margin: 0;
            padding: 32px 20px;
          }
          .report-wrapper {
            max-width: 960px;
            margin: 0 auto;
            background-color: #FFFFFF;
            border: 1px solid #D8D2C5;
            border-radius: 6px;
            padding: 24px;
            box-shadow: 0 1px 3px rgba(38, 37, 34, 0.07);
          }
          h1 {
            margin: 0 0 6px 0;
            font-size: 1.4rem;
            color: #262522;
          }
          p.subtitle {
            margin: 0 0 20px 0;
            color: #5A574F;
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
            border-bottom: 1px solid #D8D2C5;
          }
          th {
            background-color: #EFECE4;
            color: #5A574F;
            text-transform: uppercase;
            font-size: 0.8rem;
            letter-spacing: 0.03em;
          }
          tr:hover {
            background-color: #FAF8F3;
          }
          .badge {
            display: inline-block;
            padding: 3px 8px;
            background-color: #E8F2EA;
            color: #2D5A36;
            border: 1px solid #C5DEC9;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 600;
          }
          .summary-footer {
            margin-top: 16px;
            font-size: 0.88rem;
            color: #5A574F;
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