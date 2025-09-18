## 6. Versions module 

**Type:** Configuration Module 

This is the required base module of OCPI. This module is the starting point for any OCPI connection. Via this module, clients can learn which versions of OCPI a server supports, and which modules it supports for each of the versions. 

### 6.1. Version information endpoint 

This endpoint lists all the available OCPI versions and the corresponding URLs to where version specific details such as the supported endpoints can be found. 

Endpoint structure definition: 

No structure defined. This is open for every party to define themselves. 

Examples: 

https://www.server.com/ocpi/cpo/versions 

https://www.server.com/ocpi/emsp/versions 

https://ocpi.server.com/versions 

The exact URL to the implemented version endpoint should be given (offline) to parties that want to communicate with your OCPI implementation. 

Both, CPOs and eMSPs MUST implement such a version endpoint. 

 Method Description 

 GET Fetch information about the supported versions. 

###### 6.1.1. Data 

 Type Card. Description 

 Version + A list of supported OCPI versions. 

###### 6.1.2. Version class 

 Property Type Card . 

 Description 

 version VersionNumber 1 The version number. url URL 1 URL to the endpoint containing version specific information. 

###### 6.1.3. GET 

Fetch all supported OCPI versions of this CPO or eMSP. 


**6.1.3.1. Example** 

 [ { "version": "2.1.1", "url": "https://www.server.com/ocpi/2.1.1" }, { "version": "2.2.1", "url": "https://www.server.com/ocpi/2.2.1" } ] 

### 6.2. Version details endpoint 

Via the version details, the parties can exchange which modules are implemented for a specific version of OCPI, which interface role is implemented, and what the endpoint URL is for this interface. 

Parties that are both CPO and eMSP (or a Hub) can implement one version endpoint that covers both roles. With the information that is available in the version details, parties don’t need to implement a separate endpoint per role (CPO or eMSP) anymore. In practice this means that when a company is both a CPO and an eMSP and it connects to another party that implements both interfaces, only one OCPI connection is needed. 

 NOTE OCPI 2.2 introduced the role field in the version details. Older versions of OCPI do not support this. 

Endpoint structure definition: 

No structure defined. This is open for every party to define themselves. 

Examples: 

https://www.server.com/ocpi/cpo/2.2.1 

https://www.server.com/ocpi/emsp/2.2.1 

https://ocpi.server.com/2.2.1/details 

This endpoint lists the supported endpoints and their URLs for a specific OCPI version. To notify the other party that the list of endpoints of your current version has changed, you can send a PUT request to the corresponding credentials endpoint (see the credentials chapter). 

Both the CPO and the eMSP MUST implement this endpoint. 

 Method Description 

 GET Fetch information about the supported endpoints for this version. 

###### 6.2.1. Data 

 Property Type Card . 

 Description 

 version VersionNumber 1 The version number. 


 Property Type Card . 

 Description 

 endpoints Endpoint + A list of supported endpoints for this version. 

###### 6.2.2. Endpoint class 

 Property Type Card . 

 Description 

 identifier ModuleID 1 Endpoint identifier. 

 role InterfaceRol e 

 1 Interface role this endpoint implements. 

 url URL 1 URL to the endpoint. 

 NOTE 

 for the credentials module, the value of the role property is not relevant as this module is the same for all roles. It is advised to send "SENDER" as the InterfaceRole for one’s own credentials endpoint and to disregard the value of the role property of the Endpoint object for other platforms' credentials modules. 

###### 6.2.3. InterfaceRole enum 

 Value Description 

 SENDER Sender Interface implementation. Interface implemented by the owner of data, so the Receiver can Pull information from the data Sender/owner. 

 RECEIVER Receiver Interface implementation. Interface implemented by the receiver of data, so the Sender/owner can Push information to the Receiver. 

###### 6.2.4. ModuleID enum 

The Module identifiers for each endpoint are described in the beginning of each _Module_ chapter. The following table contains the list of modules in this version of OCPI. Most modules (except Credentials & Registration) are optional, but there might be dependencies between modules. If there are dependencies between modules, it will be mentioned in the affected module description. 

 Module ModuleID Remark 

 CDRs cdrs Charging Profiles chargingprofiles 

 Commands commands 

 Credentials & Registration credentials Required for all implementations. The role field has no function for this module. 

 Hub Client Info hubclientinfo 

 Locations locations 


 Module ModuleID Remark 

 Sessions sessions 

 Tariffs tariffs 

 Tokens tokens 

###### 6.2.5. VersionNumber enum 

List of known versions. 

 Value Description 

 2.0 OCPI version 2.0 

 2.1 OCPI version 2.1 (DEPRECATED, do not use, use 2.1.1 instead) 

 2.1.1 OCPI version 2.1.1 

 2.2 OCPI version 2.2 (DEPRECATED, do not use, use 2.2.1 instead) 

 2.2.1 OCPI version 2.2.1 (this version) 

**6.2.5.1. Custom Modules** 

Parties are allowed to create custom modules or customized versions of the existing modules. To do so, the ModuleID enum can be extended with additional custom moduleIDs. These custom moduleIDs MAY only be sent to parties with which there is an agreement to use a custom module. Do NOT send custom moduleIDs to parties you are not 100% sure will understand the custom moduleIDs. It is advised to use a prefix (e.g. country-code + party-id) for any custom moduleID, this ensures that the moduleID will not be used for any future module of OCPI. 

For example: nltnm-tokens 

###### 6.2.6. GET 

Fetch information about the supported endpoints and their URLs for this OCPI version. 

**6.2.6.1. Examples** 

Simple version details example: CPO with only 2 modules. 

 { "version": "2.2", "endpoints": [ { "identifier": "credentials", "role": "SENDER", "url": "https://example.com/ocpi/2.2/credentials" }, { "identifier": "locations", "role": "SENDER", "url": "https://example.com/ocpi/cpo/2.2/locations" } ] } 


Simple version details example: party with both CPO and eMSP with only 2 modules. 

In this case the credentials module is not defined twice as this module is the same for all roles. 

 { "version": "2.2", "endpoints": [ { "identifier": "credentials", "role": "RECEIVER", "url": "https://example.com/ocpi/2.2/credentials" }, { "identifier": "locations", "role": "SENDER", "url": "https://example.com/ocpi/cpo/2.2/locations" }, { "identifier": "tokens", "role": "RECEIVER", "url": "https://example.com/ocpi/cpo/2.2/tokens" }, { "identifier": "locations", "role": "RECEIVER", "url": "https://example.com/ocpi/msp/2.2/locations" }, { "identifier": "tokens", "role": "SENDER", "url": "https://example.com/ocpi/msp/2.2/tokens" } ] }
