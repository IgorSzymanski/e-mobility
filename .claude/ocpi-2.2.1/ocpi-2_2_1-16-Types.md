## 16. Types 

### 16.1. CiString type 

Case Insensitive String. Only printable ASCII allowed. (Non-printable characters like: Carriage returns, Tabs, Line breaks, etc are not allowed) 

### 16.2. DateTime type 

All timestamps are formatted as string(25) following RFC 3339, with some additional limitations. 

All timestamps SHALL be in UTC. The absence of the timezone designator implies a UTC timestamp. Fractional seconds MAY be used. 

Example of how timestamps shall be formatted in OCPI, other formats/patterns are not allowed: 

 2015-06-29T20:39:09Z 2015-06-29T20:39:09 2016-12-29T17:45:09.2Z 2016-12-29T17:45:09.2 2018-01-01T01:08:01.123Z 2018-01-01T01:08:01.123 

 NOTE +00:00 is not the same as UTC. 

### 16.3. DisplayText class 

 Property Type Card . 

 Description 

 language string(2) 1 Language Code ISO 639-1. 

 text string(512) 1 Text to be displayed to a end user. No markup, html etc. allowed. 

Example: 

 { "language": "en", "text": "Standard Tariff" } 

### 16.4. number type 

Numbers in OCPI are formatted as JSON numbers. Unless mentioned otherwise, numbers use 4 decimals and a _sufficiently large amount_ of digits. 


### 16.5. Price class 

 Property Type Card . 

 Description 

 excl_vat number 1 Price/Cost excluding VAT. 

 incl_vat number? Price/Cost including VAT. 

### 16.6. Role enum 

 Value Description 

 CPO Charge Point Operator Role. 

 EMSP eMobility Service Provider Role. 

 HUB Hub role. 

 NAP National Access Point Role (national Database with all Location information of a country). 

 NSP Navigation Service Provider Role, role like an eMSP (probably only interested in Location information). 

 OTHER Other role. 

 SCSP Smart Charging Service Provider Role. 

### 16.7. string type 

Case Sensitive String. Only printable UTF-8 allowed. (Non-printable characters like: Carriage returns, Tabs, Line breaks, etc are not allowed) 

All strings in messages and enumerations are case sensitive, unless explicitly stated otherwise. 

### 16.8. URL type 

An URL a string(255) type following the w3.org spec.
