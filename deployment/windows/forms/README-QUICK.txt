LAKE GROUP WEBSITE FORMS

1. Open PowerShell as Administrator.
2. Go to this folder.
3. Run:

   .\deploy-forms.ps1

4. Enter the Gmail App Password when requested.
5. Wait for "READY FOR CONTROLLED EMAIL TESTING".

To preview changes only:
   .\deploy-forms.ps1 -WhatIf

To check later:
   .\verify-forms.ps1

To undo this deployment:
   .\rollback-forms.ps1
