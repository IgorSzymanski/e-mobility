## 14. ChargingProfiles module 

**Module Identifier: chargingprofiles** 

**Type:** Functional Module 

With the ChargingProfiles module, parties (SCSP but also MSPs) can send (Smart) Charging Profiles to a Location/EVSE. It is also possible to request the 'ActiveChargingProfile' from a Location/EVSE. 

The ActiveChargingProfile is the charging profile as calculated by the EVSE. It is the result of the calculation of all smart charging inputs present in the EVSE, also Local Limits might be taken into account. 

The ChargingProfile is similar to the concept of Charging Profiles in OCPP, but exposes this functionality to third parties. These objects and the accompanying interfaces make certain abstractions that make them more suitable for energy parties to signal their intent. The data structures are base on OCPP 1.6 and 2.0 to make conversion of messages between OCPI and OCPP easy. 

 NOTE 

 Charging Profiles set via this module are no guarantee that the EV will charge with the exact given limit, it is a maximum limit, not a target. A lot of factors influence the charging speed. The EV might not take the amount of energy that the EVSE is willing to provide to it, the battery might be too warm or almost full. A single phase cable might be used on a three phase Charge Point. There can be local energy limits (load balancing between EVSEs on a relative small energy connection to a group of EVSEs) that might limit the energy offered by the EVSE to the EV even further. 

ChargingProfile can be created by the owner of a Token on Sessions that belong to that token. If another party sends a ChargingProfile and the CPO has no contract that allows that party to set profiles on sessions, the CPO is allowed to reject such profiles. 

This module can be used by the eMSP, but can also be used by another party that provide "Smart Charging Services" (Smart Charging Service Provider (SCSP) / Aggregator / Energy Service Broker etc.) These SCSPs then depend on the CPO sending session information to them. They need to know which session is ongoing to be able to influence it. If a SCSP uses this module, read eMSP as SCSP. 

 NOTE 

 OCPI provides the means for SCSPs to do this. Parties doing this have to adhere to local privacy laws, have to have setup contracts etc. Local laws might oblige explicit consent from the driver etc. 

**Module dependency:** Sessions module 

### 14.1. Smart Charging Topologies 

There are different Smart Charging Topologies possible. Which topology can be used depends on the contracts between different parties. 

 NOTE 

 Care has to be taken to prevent mixing the different topologies. When multiple parties start sending Charging Profiles, the resulting charging speed might be unpredictable. In case of OCPP Charge Points, the result will be the minimum of all the Charging Profiles, resulting in a slower than needed charging speed. 


###### 14.1.1. The eMSP generates ChargingProfiles. 

The most straight forward topology, the eMSP generates ChargingProfiles for its own customers, no SCSP is involved. The eMSP 'owns' the customer, so if the eMSP knows that its customer agrees with the eMSP manipulating the charging speed, the eMSP is free to do this. 

eMSP OCPI CPO Charge Point 

_Figure 36. Smart Charging Topology: The eMSP generates ChargingProfiles._ 

 Interfac e 

 Role 

 Sender eMSP 

 Receiver CPO 

###### 14.1.2. The eMSP delegated Smart Charging to SCSP. 

In the topology, the eMSP has delegated the generation of ChargingProfiles to a SCSP. For this, the eMSP and SCSP have agreed to use OCPI as the interface. 

The eMSP 'owns' the customer, so if the eMSP knows that its customer agrees with the eMSP manipulating the charging speed, the eMSP is free to do this. The eMSP can forward OCPI Session Objects to the SCSP. the SCSP can act on the received/updated Session Objects, by sending Charging Profile commands via the eMSP to the CPO. 

The eMSP and SCSP have to take into account that they have to oblige to local privacy laws when exchanging information about eMSPs customers. 

From the CPO point of view, this topology is similar to the one above, the CPO will not know the difference. 

SCSP OCPI^ eMSP OCPI CPO Charge Point 

_Figure 37. Smart Charging Topology: The eMSP generates ChargingProfiles._ 

 Connection Interface Role 

 SCSP eMSP Sender SCSP 

 SCSP eMSP Receiver eMSP 

 eMSP CPO Sender eMSP 

 eMSP CPO Receiver CPO 

###### 14.1.3. The CPO delegated Smart Charging to SCSP. 

In this topology, the CPO has delegated the generation of ChargingProfiles to a SCSP. For this, the CPO and SCSP have agreed to use OCPI as the interface. 

The CPO 'owns' the EVSE on which charging happens. As the CPO does not 'own' the customers, the CPO needs to 


make sure the EV driver knows that the charging speed might not be the maximum the driver has expected, this could be something as simple as a sticker on the Charge Point, or might even be part of the tariff text. 

The CPO might generate ChargingProfiles themselves, but as OCPI is then not used this is not part of this document. 

The CPO can forward OCPI Session Objects to the SCSP. the SCSP can act on the received/updated Session Objects, by sending Charging Profile commands to the CPO. 

The CPO and SCSP have to take into account that they have to oblige to local privacy laws when exchanging information about eMSPs customers. 

In this topology, the eMSP is not aware that the CPO is using OCPI to receive Charging Profiles from the SCSP. 

eMSP 

SCSP 

CPO Charge Point 

 OCPI 

 OCPI 

_Figure 38. Smart Charging Topology: The eMSP generates ChargingProfiles._ 

 Interfac e 

 Role 

 Sender SCSP 

 Receiver CPO 

### 14.2. Use Cases 

This module is designed to support the following use cases, for all the above mentioned topologies. 

- The eMSP/SCSP sends/updates a ChargingProfile to manipulate an ongoing charging session. 

- The eMSP/SCSP request to remove the set ChargingProfile from an ongoing charging session. 

- The eMSP/SCSP request the ActiveChargingProfile for an ongoing charging session. 

- The CPO updates the eMSP/SCSP of changes to an ActiveChargingProfile. 

### 14.3. Flow 

The ChargingProfile creation is a request to activate a charging profile on a running charging session. 

Most Charge Points are hooked up to the internet via a relative slow wireless connection. To prevent long blocking calls, the ChargingProfile module is designed to work asynchronously. (similar to the Commands module. 

The Sender (Typically SCSP) sends a request to a Receiver (Typically CPO), via the Receiver interface. The Receiver checks if it can send the request to a Charge Point and will respond to the request with a status, indicating if the request can be sent to a Charge Point. 

The Receiver sends the requested command (via another protocol, for example: OCPP) to a Charge Point. The Charge Point will respond if it understands the command and will try to execute the command. This response doesn’t 


always mean that the ChargingProfile will be executed. The CPO will forward the result in a new POST request to the Sender (Typically SCSP) ChargingProfile interface. 

The Sender (Typically SCSP) can send the Charging Profile to the EVSE via the CPO by using the CPO PUT method for an ongoing session. The Sender can request the current profile the EVSE has calculated, based on different inputs, and is planned to be used for the ongoing session by calling the CPO GET method. The Sender has the ability to remove the Charging Profile for the session by calling the CPO DELETE method 

When the Sender has (at least once) successfully sent a Charging Profile for an ongoing charging session, the Receiver (Typically CPO) SHALL keep the Sender updated with changes to the ActiveChargingProfile of that Session. If the Receiver is aware of any changes, he notifies the Sender by calling the MSP PUT method. The changes might be triggered by the CPO sending additional Charging Profiles, or the some local limit being applied to the Charge Point, and the Charge Point notifies the CPO of the Changes. 

The Receiver can cancel/remove an existing ChargingProfile, it can let the eMSP know by calling the MSP PUT method 

For calculating optimum ChargingProfiles it might be useful for the eMSP or SCSP to know the ChargingProfile that the Charge Point has planned for the Session: ActiveChargingProfile. The ActiveChargingProfile might differ from ChargingProfile requested via OCPI. There might be other limiting factors being taken into account by the CPO and or Charge Point, that limit the ChargingProfile. The ActiveChargingProfile profile can be requested by the Sender by calling the CPO GET method on the Charging Profile Receiver interface. The CPO will then ask the Charge Point for the planned ActiveChargingProfile. When that is received it is forwarded to the URL given by the eMSP or SCSP. 

The CPO can limit the amount of request that can be done on the Charging Profiles interface, this too prevent creating a too high load or data usages. To do this the CPO can reject a request on the Charging Profile Receiver interface be responding with: TOO_OFTEN. 

If the Sender (typically eMSP or SCSP) wants to have a reference between the calls sent to the Receivers interface and the asynchronous result received from the Charge Point via the CPO, the Sender can make some unique identifier part of the`response_url` that is part of every method in the Receiver interface. The Receiver will call this URL when the result is received from the Charge Point. The Sender can then match the unique identifier from the URL called with the request. 

###### 14.3.1. Example of setting/updating a ChargingProfile by the Sender 

###### (typically the SCSP or eMSP) 

When a new Session is started, or when an update to an existing Session is available, the CPO sends the Session object to the eMSP or SCSP. The eMSP or SCSP calculates a Charging Profile and sends it to the CPO by calling the Charging Profiles PUT method on the Receiver interface. 

The CPO responds to the eMSP or SCSP, the response body will contain the response to the request, acknowledging the request was understood and can be forwarded to the Charge Point. 

The CPO sends the requests to the Charge Point. When the CPO receives a response from the Charge Point, that result is sent to the eMSP or SCSP by call the POST method, on the URL provided by the eMSP of SCSP in the PUT request, this call will contain a ChargingProfileResult Object. 


 Sender eMSP or SCSP 

 CPO Receiver Charge Point StartTransaction.req(Token=200) StartTransaction.conf(TransactionId=15) Session(id=15) 

 Calculate ChargingProfile 

 PUT https://server.com/ocpi/2.2/chargingprofiles/15 SetChargingProfile(response_url=https://client.com/12345) status_code = 1000, data: {ChargingProfileResponse { result = ACCEPTED }} SetChargingProfile.req SetChargingProfile.conf POST https://client.com/12345 ChargingProfileResult(result = ACCEPTED) 

_Figure 39. Example of a SetChargingProfile._ 

###### 14.3.2. Example of a setting/updating a ChargingProfile by the SCSP via the 

###### eMSP 

When a new Session is started, the CPO sends the Session object to the eMSP, the eMSP forwards the Session object to the SCSP. 

When a new Session is started, or when an update to an existing Session is available, the CPO sends the Session object to the eMSP. The eMSP forwards the Session Object to the SCSP. The SCSP calculates a Charging Profile and sends it to the eMSP by calling the Charging Profiles PUT method on the Sender interface implemented by the eMSP. The eMSP forwards it to the CPO by calling the Charging Profiles PUT method on the Receiver interface. 

The CPO responds to the eMSP, the response body will contain the response to the request, acknowledging the request was understood and can be forwarded to the Charge Point. The eMSP forwards this response to the SCSP. 

The CPO sends the requests to the Charge Point. When the CPO receives a response from the Charge Point, that result is sent to the eMSP by the POST method, on the URL provided by the eMSP in the PUT request from the eMSP. The eMSP forwards this result to the the URL provided by the SCSP in the PUT request of the SCSP, this call will contain a ChargingProfileResult Object. 


 SenderSCSP 

 Sender^ eMSP Receiver^ & Receiver^ CPO Charge Point StartTransaction.req(Token=200) StartTransaction.conf(TransactionId=15) Session(id=15) Session(id=15) Calculate ChargingProfile PUT https://emsp.com/ocpi/2.2/chargingprofiles/15 SetChargingProfile(response_url=https://client.com/12345) PUT https://cpo.com/ocpi/2.2/chargingprofiles/15 SetChargingProfile(response_url=https://emsp.com/4567) status_code = 1000, data: {ChargingProfileResponse { result = ACCEPTED }} status_code = 1000, data: {ChargingProfileResponse { result = ACCEPTED }} SetChargingProfile.req SetChargingProfile.conf POST https://emsp.com/4567 ChargingProfileResult(result = ACCEPTED) 

 POST https://client.com/12345 ChargingProfileResult(result = ACCEPTED) 

_Figure 40. Example of a SetChargingProfile via the MSP._ 

###### 14.3.3. Example of a removing/clearing ChargingProfile sent by the Sender 

###### (typically the eMSP or SCSP) 

The Sender might want to remove the charging profile, for example the EV driver has selected to switch to charging with the highest speed possible. The Sender can ask the CPO to remove the set charging profile. This can be done by calling the DELETE method on the Receiver interface. 

The CPO responds to the eMSP or SCSP, the response body will contain the response to the request, acknowledging the request was understood and can be forwarded to the Charge Point. 

The CPO sends the clear requests to the Charge Point. When the CPO receives a response from the Charge Point, that result is sent to the eMSP by call the POST method, on the URL provided by the eMSP in the DELETE request of the eMSP, this call will contain a ClearProfileResult Object. 

 Sender eMSP or SCSP 

 CPO Receiver Charge Point 

 Ongoing Session with id=15 DELETE https://server.com/ocpi/2.2/chargingprofiles/15?response_url=https://client.com/12345 status_code = 1000, data: {ChargingProfileResponse { result = ACCEPTED }} ClearChargingProfile.req ClearChargingProfile.conf POST https://client.com/12345 ClearProfileResult(result = ACCEPTED) 

_Figure 41. Example of a ClearChargingProfile._ 

###### 14.3.4. Example of a removing/clearing ChargingProfile send by the SCSP 

###### via the eMSP 

The SCSP might want to remove the charging profile, for example the EV driver has selected to switch to charging 


with the highest speed possible. The SCSP can ask the eMSP to ask the CPO to remove the set charging profile. This can be done by calling the DELETE method on the eMSPs Charging Profile Receiver interface. The eMSP forwards this to the CPO by calling the DELETE method on the CPOs Charging Profile Receiver interface. 

The CPO responds to the eMSP, the response body will contain the response to the request, acknowledging the request was understood and can be forwarded to the Charge Point. The eMSP forwards this response to the SCSP. 

The CPO send the clear requests to the Charge Point. When the CPO receives a response from the Charge Point, that result is sent to the eMSP by call the POST method, on the URL provided by the eMSP in the DELETE request of the eMSP. The eMSP forwards this result to the the URL provided by the SCSP in the DELETE request of the SCSP, this call will contain a ClearProfileResult Object. 

 SCSP 

 eMSP Sender Receiver^ & Receiver^ CPO Charge Point Ongoing Session with id=15 DELETE https://server.com/ocpi/2.2/chargingprofiles/15 ?response_url=https://scsp.com/12345 DELETE https://server.com/ocpi/2.2/chargingprofiles/15 ?response_url=https://emsp.com/789AB status_code = 1000, data: {ChargingProfileResponse { result = ACCEPTED }} status_code = 1000, data: {ChargingProfileResponse { result = ACCEPTED }} ClearChargingProfile.req ClearChargingProfile.conf POST https://emsp.com/789AB ClearProfileResult(result = ACCEPTED) 

 POST https://scsp.com/12345 ClearProfileResult(result = ACCEPTED) 

_Figure 42. Example of a ClearChargingProfile via the MSP._ 

###### 14.3.5. Example of a GET ActiveChargingProfile send by the Sender 

###### (typically the eMSP or SCSP) 

When the Sender wants to know the current planned charging profile for a session, the Sender can ask the CPO for the ActiveChargingProfile by calling the GET method on the Receiver interface. 

The CPO responds to the eMSP or SCSP, the response body will contain the response to the request, acknowledging the request was accepted and can be forwarded to the Charge Point. 

The CPO sends a message to the Charge Point to retrieve the current active charging profile. When the CPO receives a response from the Charge Point, that ActiveChargingProfile is sent to the eMSP by call the POST method, on the URL provided by the eMSP in the GET request of the eMSP, this call will contain a ActiveChargingProfileResult Object. 


 Sender eMSP or SCSP 

 CPO Receiver Charge Point 

 Ongoing Session with id=15 GET https://server.com/ocpi/2.2/chargingprofiles/15?response_url=https://client.com/12345 status_code = 1000, data: {ChargingProfileResponse { result = ACCEPTED }} GetCompositeSchedule.req GetCompositeSchedule.conf POST https://client.com/12345 ActiveProfileResult(result = ACCEPTED, ActiveChargingProfile) 

_Figure 43. Example of a GET ActiveChargingProfile._ 

###### 14.3.6. Example of a GET ActiveChargingProfile send by the SCSP via eMSP 

When the SCSP wants to known the current planned charging profile for a session, the SCSP can ask the the eMSP to ask the CPO for the ActiveChargingProfile by calling the GET method on the eMSPs Charging Profile Receiver interface. The eMSP forwards this to the CPO by calling the GET method on the CPOs Charging Profile Receiver interface. 

The CPO responds to the eMSP, the response body will contain the response to the request, acknowledging the request was accepted and can be forwarded to the Charge Point. The eMSP forwards this response to the SCSP. 

The CPO sends a message to the Charge Point to retrieve the current active charging profile. When the CPO receives a response from the Charge Point, that ActiveChargingProfile is sent to the eMSP by call the POST method, on the URL provided by the eMSP in the GET request of the eMSP, this call will contain a ActiveChargingProfileResult Object. The eMSP forwards this result to the the URL provided by the SCSP in the GET request of the SCSP, this call will contain the same ActiveChargingProfileResult Object. 

 Sender^ SCSP 

 Sender^ eMSP Receiver^ & Receiver^ CPO Charge Point Ongoing Session with id=15 GET https://server.com/ocpi/2.2/chargingprofiles/15 ?response_url=https://scsp.com/12345 GET https://server.com/ocpi/2.2/chargingprofiles/15 ?response_url=https://emsp.com/789AB status_code = 1000, data: {ChargingProfileResponse { result = ACCEPTED }} status_code = 1000, data: {ChargingProfileResponse { result = ACCEPTED }} GetCompositeSchedule.req GetCompositeSchedule.conf POST https://emsp.com/789AB ActiveProfileResult(result = ACCEPTED, ActiveChargingProfile) 

 POST https://scsp.com/12345 ActiveProfileResult(result = ACCEPTED, ActiveChargingProfile) 

_Figure 44. Example of a GET ActiveChargingProfile via the MSP._ 

###### 14.3.7. Example of the Receiver (typically the CPO) sending an updated 

###### ActiveChargingProfile 

When the CPO knows the ActiveChargingProfile of a Charge Point has changed, the Receiver (typically the CPO) sends this update ActiveChargingProfile to the Sender (typically the eMSP or SCSP), by calling the PUT method on the 


Sender interface. 

 Charge Point 

 CPO Receiver 

 Sender eMSP or SCSP 

 Ongoing Session with id=15 

 update ChargingProfile PUT https://www.server.com/ocpi/2.2/chargingprofiles/15 ActiveChargingProfile() 

_Figure 45. Example of an ActiveChargingProfile being send by the CPO_ 

###### 14.3.8. Example of the Receiver (typically the CPO) sending an updated 

###### ActiveChargingProfile to the SCSP via the eMSP 

When the CPO knows the ActiveChargingProfile of a Charge Point has changed, the Receiver (typically the CPO) sends this update ActiveChargingProfile to the Sender (SCSP), by calling the PUT method on the eMSPs Sender interface. 

The eMSP forwards this ActiveChargingProfile to the SCSP, by calling the PUT method on the SCSPs Sender interface. 

 Charge Point Receiver^ CPO^ Sender eMSP Sender^ SCSP Ongoing Session with id=15 update ChargingProfile PUT https://www.server.com/ocpi/2.2/chargingprofiles/15 ActiveChargingProfile() 

 PUT https://www.server.com/ocpi/2.2/chargingprofiles/15 ActiveChargingProfile() 

_Figure 46. Example of an ActiveChargingProfile being sent by the CPO via the eMSP_ 

### 14.4. Interfaces and endpoints 

The ChargingProfiles module consists of two interfaces: a Receiver interface that enables a Sender (and its clients) to send ChargingProfiles to a Location/EVSE, and an Sender interface to receive the response from the Location/EVSE asynchronously. 

###### 14.4.1. Receiver Interface 

Typically implemented by market roles like: CPO. 

Example endpoint structures: 

 Method Description GET Gets the ActiveChargingProfile for a specific charging session. 

 POST n/a 


 Method Description 

 PUT Creates/updates a ChargingProfile for a specific charging session. 

 PATCH n/a 

 DELETE Cancels an existing ChargingProfile for a specific charging session. 

**14.4.1.1. GET Method** 

Retrieves the ActiveChargingProfile as it is currently planned for the the given session. 

Endpoint structure definition: 

{chargingprofiles_endpoint_url}{session_id}?duration={duration}&response_url={url} 

Example: 

https://www.cpo.com/ocpi/2.2.1/chargingprofiles/1234?duration=900&response_url=https://www.msp.com/ocpi/2.2.1/ chargingprofile/response?request_id=5678 

 NOTE As it is not common to add a body to a GET request, all parameters are added to the URL. 

**Request Parameters** 

The following parameters shall be provided as URL segments. 

 Parameter Datatype Requ ired 

 Description 

 session_id CiString(36) yes The unique id that identifies the session in the Receiver platform. 

 duration int yes Length of the requested ActiveChargingProfile in seconds Duration in seconds. * 

 response_url URL yes URL that the ActiveChargingProfileResult POST should be sent to. This URL might contain a unique ID to be able to distinguish between GET ActiveChargingProfile requests. 

 NOTE 

 duration: Balance the duration between maximizing the information gained and the data usage and computation to execute on the request. Warning: asking for longer duration than necessary might result in additional data costs, while its added value diminishes with every change in the schedule. 

**Response Data** 

The response contains the direct response from the Receiver, not the response from the EVSE itself. That information will be sent via an asynchronous POST on the Sender interface if this response is ACCEPTED. 


 Datatype Card . 

 Description 

 ChargingProfileResponse 1 Result of the ActiveChargingProfile request, by the Receiver (Typically CPO), not the location/EVSE. So this indicates if the Receiver understood the ChargingProfile request and was able to send it to the EVSE. This is not the response by the Charge Point. 

**14.4.1.2. PUT Method** 

Creates a new ChargingProfile on a session, or replaces an existing ChargingProfile on the EVSE. 

Endpoint structure definition: 

{chargingprofiles_endpoint_url}{session_id} 

Example: 

https://www.cpo.com/ocpi/2.2.1/chargingprofiles/1234 

**Request Parameters** 

The following parameter shall be provided as URL segments. 

 Parameter Datatype Requ ired 

 Description 

 session_id CiString(36) yes The unique id that identifies the session in the Receiver platform. 

**14.4.1.3. Request Body** 

The body contains a SetChargingProfile object, that contains the new ChargingProfile and a response URL. 

 Type Card . 

 Description 

 SetChargingProfile 1 SetChargingProfile object with information needed to set/update the Charging Profile for a session. 

**Response Data** 

The response contains the direct response from the Receiver (Typically CPO), not the response from the EVSE itself, that will be sent via an asynchronous POST on the Sender interface if this response is ACCEPTED. 

 Datatype Card . 

 Description 

 ChargingProfileResponse 1 Result of the ChargingProfile PUT request, by the CPO (not the location/EVSE). So this indicates if the CPO understood the ChargingProfile PUT request and was able to send it to the EVSE. This is not the response by the Charge Point. 


**14.4.1.4. DELETE Method** 

Clears the ChargingProfile set by the eMSP on the given session. 

Endpoint structure definition: 

{chargingprofiles_endpoint_url}{session_id}?response_url={url} 

Example: 

https://www.cpo.com/ocpi/2.2.1/chargingprofiles/1234?response_url=https://www.server.com/example 

 NOTE As it is not common to add a body to a DELETE request, all parameters are added to the URL. 

**Request Parameters** 

The following parameters shall be provided as URL segments. 

 Parameter Datatype Requ ired 

 Description 

 session_id CiString(36) yes The unique id that identifies the session in the Receiver platform. 

 response_url URL yes URL that the ClearProfileResult POST should be sent to. This URL might contain a unique ID to be able to distinguish between DELETE ChargingProfile requests. 

**Response Data** 

The response contains the direct response from the Receiver (typically CPO), not the response from the EVSE itself, that will be sent via an asynchronous POST on the Sender interface if this response is ACCEPTED. 

 Datatype Card . 

 Description 

 ChargingProfileResponse 1 Result of the ChargingProfile DELETE request, by the CPO (not the location/EVSE). So this indicates if the CPO understood the ChargingProfile DELETE request and was able to send it to the EVSE. This is not the response by the Charge Point. 

###### 14.4.2. Sender Interface 

Typically implemented by market roles like: SCSP. 

The Sender interface receives the asynchronous responses. 

 Method Description 

 GET n/a 

 POST Receive the asynchronous response from the Charge Point. 


 Method Description 

 PUT Receiver (typically CPO) can send an updated ActiveChargingProfile when other inputs have made changes to existing profile. When the Receiver (typically CPO) sends a update profile to the EVSE, for an other reason then the Sender (Typically SCSP) asking, the Sender SHALL post an update to this interface. When a local input influence the ActiveChargingProfile in the EVSE AND the Receiver (typically CPO) is made aware of this, the Receiver SHALL post an update to this interface. 

 PUT n/a 

 PATCH n/a 

 DELETE n/a 

**14.4.2.1. POST Method** 

**Request Parameters** 

There are no URL segment parameters required by OCPI. 

As the Sender interface is called by the Receiver (typically CPO) on the URL given response_url in the Sender request to the Receiver interface. It is up to the implementation of the Sender (typically SCSP) to determine what parameters are put in the URL. The Sender sends a URL in the POST method body to the Receiver. The Receiver is required to use this URL for the asynchronous response by the Charge Point. It is advised to make this URL unique for every request to differentiate simultaneous commands, for example by adding a unique id as a URL segment. 

Endpoint structure definition: 

No structure defined. This is open to the eMSP to define, the URL is provided to the Receiver by the Sender. Therefor OCPI does not define variables. 

Examples: 

https://www.server.com/ocpi/2.2.1/chargingprofiles/chargingprofile/12345678 

https://www.server.com/activechargingprofile/12345678 

https://www.server.com/clearprofile?request_id=12345678 

https://www.server.com/ocpi/2.2.1/12345678 

The content of the request body depends on the original request by the eMSP to which this POST is send as a result. 

**14.4.2.2. Request Body** 

 Datatype Card . 

 Description 

 Choice: one of three 

 ActiveChargingProfileRes ult 

 1 Result of the GET ActiveChargingProfile request, from the Charge Point. 

 ChargingProfileResult 1 Result of the PUT ChargingProfile request, from the Charge Point. 


 Datatype Card . 

 Description 

 ClearProfileResult 1 Result of the DELETE ChargingProfile request, from the Charge Point. 

**14.4.2.3. Response Body** 

The response to the POST on the Sender interface SHALL contain the Response Format with the data field omitted. 

**14.4.2.4. PUT Method** 

Updates the Sender (typically SCSP) when the Receiver (typically CPO) knows the ActiveChargingProfile has changed. 

The Receiver SHALL call this interface every time it knows changes have been made that influence the ActiveChargingProfile for an ongoing session AND the Sender has at least once successfully called the charging profile Receiver PUT interface for this session (SetChargingProfile). If the Receiver doesn’t know the ActiveChargingProfile has changed (EVSE does not notify the Receiver (typically CPO) of the change) it is not required to call this interface. 

The Receiver SHALL NOT call this interface for any session where the Sender has never, successfully called the charging profile Receiver PUT interface for this session (SetChargingProfile). 

The Receiver SHALL send a useful relevant duration of ActiveChargingProfile to send to the Sender. As a guide: between 5 and 60 minutes. If the Sender wants a longer ActiveChargingProfile the Sender can always do a GET with a longer duration. 

Endpoint structure definition: 

{chargingprofiles_endpoint_url}{session_id} 

Example: 

https://www.server.com/ocpi/2.2.1/chargingprofiles/1234 

**Request Parameters** 

The following parameter shall be provided as URL segments. 

 Parameter Datatype Requ ired 

 Description 

 session_id CiString(36) yes The unique id that identifies the session in the Receiver platform. 

**14.4.2.5. Request Body** 

The body contains the update ActiveChargingProfile, The ActiveChargingProfile is the charging profile as calculated by the EVSE. 


 Type Card . 

 Description 

 ActiveChargingProfile 1 The new ActiveChargingProfile. If there is no longer any charging profile active, the ActiveChargingProfile SHALL reflect this by showing the maximum charging capacity of the EVSE. 

**14.4.2.6. Response Body** 

The response to the PUT on the eMSP interface SHALL contain the Response Format with the data field omitted. 

### 14.5. Object description 

###### 14.5.1. ChargingProfileResponse Object 

The ChargingProfileResponse object is send in the HTTP response body. 

Because OCPI does not allow/require retries, it could happen that the asynchronous result url given by the eMSP is never successfully called. The eMSP might have had a glitch, HTTP 500 returned, was offline for a moment etc. For the eMSP to be able to reject to timeouts, it is important for the eMSP to know the timeout on a certain command. 

 Property Type Card . 

 Description 

 result ChargingProfileResponseType 1 Response from the CPO on the ChargingProfile request. 

 timeout int 1 Timeout for this ChargingProfile request in seconds. When the Result is not received within this timeout, the eMSP can assume that the message might never be sent. 

###### 14.5.2. ActiveChargingProfileResult Object 

The ActiveChargingProfileResult object is send by the CPO to the given response_url in a POST request. It contains the result of the GET (ActiveChargingProfile) request send by the eMSP. 

 Property Type Card . 

 Description 

 result ChargingProfileResultTyp e 

 1 The EVSE will indicate if it was able to process the request for the ActiveChargingProfile 

 profile ActiveChargingProfile? The requested ActiveChargingProfile, if the result field is set to: ACCEPTED 

###### 14.5.3. ChargingProfileResult Object 

The ChargingProfileResult object is send by the CPO to the given response_url in a POST request. It contains the result of the PUT (SetChargingProfile) request send by the eMSP. 


 Property Type Card . 

 Description 

 result ChargingProfileResultTyp e 

 1 The EVSE will indicate if it was able to process the new/updated charging profile. 

###### 14.5.4. ClearProfileResult Object 

The ClearProfileResult object is send by the CPO to the given response_url in a POST request. It contains the result of the DELETE (ClearProfile) request send by the eMSP. 

 Property Type Card . 

 Description 

 result ChargingProfileResultTyp e 

 1 The EVSE will indicate if it was able to process the removal of the charging profile (ClearChargingProfile). 

###### 14.5.5. SetChargingProfile Object 

Object set to a CPO to set a Charging Profile. 

 Property Type Card . 

 Description 

 charging_profile ChargingProfile 1 Contains limits for the available power or current over time. 

 response_url URL 1 URL that the ChargingProfileResult POST should be sent to. This URL might contain a unique ID to be able to distinguish between GET ActiveChargingProfile requests. 

### 14.6. Data types 

###### 14.6.1. ActiveChargingProfile class 

 Property Type Card . 

 Description 

 start_date_time DateTime 1 Date and time at which the Charge Point has calculated this ActiveChargingProfile. All time measurements within the profile are relative to this timestamp. 

 charging_profile ChargingProfile 1 Charging profile structure defines a list of charging periods. 

###### 14.6.2. ChargingRateUnit enum 

Unit in which a charging profile is defined. 


 Value Description 

 W Watts (power) This is the TOTAL allowed charging power. If used for AC Charging, the phase current should be calculated via: Current per phase = Power / (Line Voltage * Number of Phases). The "Line Voltage" used in the calculation is the Line to Neutral Voltage (VLN). In Europe and Asia VLN is typically 220V or 230V and the corresponding Line to Line Voltage (VLL) is 380V and 400V. The "Number of Phases" is the numberPhases from the ChargingProfilePeriod. It is usually more convenient to use this for DC charging. Note that if numberPhases in a ChargingProfilePeriod is absent, 3 SHALL be assumed. 

 A Amperes (current) The amount of Ampere per phase, not the sum of all phases. It is usually more convenient to use this for AC charging. 

###### 14.6.3. ChargingProfile class 

Charging profile class defines a list of charging periods. 

 Property Type Card . 

 Description 

 start_date_time DateTime? Starting point of an absolute profile. If absent the profile will be relative to start of charging. 

 duration int? Duration of the charging profile in seconds. If the duration is left empty, the last period will continue indefinitely or until end of the transaction in case start_date_time is absent. 

 charging_rate_unit ChargingRateUnit 1 The unit of measure. 

 min_charging_rate number? Minimum charging rate supported by the EV. The unit of measure is defined by the chargingRateUnit. This parameter is intended to be used by a local smart charging algorithm to optimize the power allocation for in the case a charging process is inefficient at lower charging rates. Accepts at most one digit fraction (e.g. 8.1) 

 charging_profile_period ChargingProfilePeriod * List of ChargingProfilePeriod elements defining maximum power or current usage over time. 

###### 14.6.4. ChargingProfilePeriod class 

Charging profile period structure defines a time period in a charging profile, as used in: ChargingProfile 

 Property Type Card . 

 Description 

 start_period int 1 Start of the period, in seconds from the start of profile. The value of StartPeriod also defines the stop time of the previous period. 


 Property Type Card . 

 Description 

 limit number 1 Charging rate limit during the profile period, in the applicable chargingRateUnit, for example in Amperes (A) or Watts (W). Accepts at most one digit fraction (e.g. 8.1). 

###### 14.6.5. ChargingProfileResponseType enum 

Response to the ChargingProfile request from the eMSP to the CPO. 

 Value Description 

 ACCEPTED ChargingProfile request accepted by the CPO, request will be forwarded to the EVSE. 

 NOT_SUPPORTED The ChargingProfiles not supported by this CPO, Charge Point, EVSE etc. 

 REJECTED ChargingProfile request rejected by the CPO. (Session might not be from a customer of the eMSP that send this request) 

 TOO_OFTEN ChargingProfile request rejected by the CPO, requests are send more often then allowed. 

 UNKNOWN_SESSION The Session in the requested command is not known by this CPO. 

###### 14.6.6. ChargingProfileResultType enum 

Result of a ChargingProfile request that the EVSE sends via the CPO to the eMSP. 

 Value Description 

 ACCEPTED ChargingProfile request accepted by the EVSE. 

 REJECTED ChargingProfile request rejected by the EVSE. 

 UNKNOWN No Charging Profile(s) were found by the EVSE matching the request.
