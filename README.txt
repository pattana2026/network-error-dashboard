AMS Dashboard V2.11.14 User Delete + Login Repair

Fixed one embedded </script> inside a report-print template literal, which prematurely terminated the main JavaScript script tag and caused AMS_AUTH_TOKEN is not defined. Replaced with <\/script> in source.

This package contains the same Worker as the previous User Delete Fix package, UNCHANGED. If Worker is already deployed, deploy ONLY index.html after backing up the current live HTML.

TEST ON STAGING FIRST: Admin/test_network_error/vatit login; Remark; user management; print report; delete disposable account. No live deployment was performed.
