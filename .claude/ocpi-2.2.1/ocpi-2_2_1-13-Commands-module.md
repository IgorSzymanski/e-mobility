## 13. Commands module 

**Module Identifier: commands** 

**Type:** Functional Module 

The Commands module enables remote commands to be sent to a Location/EVSE. The following commands are supported: 

- CANCEL_RESERVATION 

- RESERVE_NOW 

- START_SESSION 

- STOP_SESSION 

- UNLOCK_CONNECTOR 

See CommandType for a description of the different commands. _Use the UNLOCK_CONNECTOR command with care, please read the note at CommandType._ 

**Module dependency:** Locations module, Sessions module 

### 13.1. Flow 

With the Commands module, commands can be sent from the eMSP, via the CPO to a Charge Point. Most Charge Points are hooked up to the internet via a relative slow wireless connection. To prevent long blocking calls, the commands module is designed to work asynchronously. 

The Sender (typically eMSP) send a request to a Receiver (typically CPO), via the Receivers Commands interface. The Receiver checks if it can send the request to a Charge Point and will respond to the request with a status, indicating if the request can be sent to a Charge Point. 

The Receiver (typically CPO) sends the requested command (via another protocol, for example: OCPP) to a Charge Point. The Charge Point will respond if it understands the command and will try to execute the command. This response doesn’t always mean that the command was executed successfully. The Receiver (typically CPO) will forward the result in a new POST request to the Senders Commands interface. 

The following examples try to give insight into the message flow and the asynchronous nature of the OCPI Commands. 

Example of a START_SESSION that is accepted, but no new Session is started because EV not plugged in before end of time-out. This is an example for Charge Point that allows a remote start when the cable is not yet plugged in. Some Charge Points even require this, there might, for example, be a latch in front of the socket to prevent vandalism. 


 eMSP CPO Charge Point Command(START_SESSION, location_id=1234, token=200) status_code = 1000, data: {CommandResponse { result = ACCEPTED }} RemoteStartTransaction.req(Token=200) RemoteStartTransaction.conf(Accepted) CommandResult(result = ACCEPTED) 

 EV NOT Plugged in before time-out 

_Figure 28. START_SESSION failed_ 

Example of a START_SESSION that is accepted, but no new Session is started because the EV is not plugged in, and this Charge Point does not allow a remote start without a cable already being plugged in. 

 eMSP CPO Charge Point 

 EV NOT Plugged in Command(START_SESSION, location_id=1234, token=200) status_code = 1000, data: {CommandResponse { result = ACCEPTED }} RemoteStartTransaction.req(Token=200) RemoteStartTransaction.conf(Rejected) CommandResult(result = FAILED) 

_Figure 29. START_SESSION failed_ 

Example of a START_SESSION that is accepted and results in a new Session. 

 eMSP CPO Charge Point 

 Command(START_SESSION, location_id=1234, token.uid=200, token.type=AD_HOC_USER, token.authorization_reference=567890) status_code = 1000, data: {CommandResponse { result = ACCEPTED }} RemoteStartTransaction.req(Token=200) RemoteStartTransaction.conf(Accepted) CommandResult(result = ACCEPTED) 

 opt Authorize.req(Token=200) Authorize.conf(Accepted) EV Plugged in 

 StartTransaction.req(Token=200) StartTransaction.conf(TransactionId=15) Session(id=15, token=200, location_id=1234 authorization_reference=567890) 

_Figure 30. START_SESSION successful_ 

Example of a START_SESSION with a Token that is Whitelist: NEVER. 


The CPO should not check the Token in the START_SESSION, before sending it to the Charge Point. The CPO should assume that the eMSP only sends valid Tokens in the START_SESSION object. 

If needed, the Charge Point does an OCPP Authorize request to validate the Token (proved via OCPP). In such case the CPO only does an realtime authorization when the OCPP Authorize request is for an RFID Token and the START_SESSION for this Token was received more then 15 minutes ago. 

 eMSP CPO Charge Point 

 EV Plugged in 

 Command(START_SESSION, location_id=1234, token.uid=123, token.type=APP_USER, token.whitelist=NEVER, token.authorization_reference=567890) status_code = 1000, data: {CommandResponse { result = ACCEPTED }} RemoteStartTransaction.req(Token=123) RemoteStartTransaction.conf(Accepted) CommandResult(result = ACCEPTED) 

 opt Authorize.req(Token=123) Authorize.conf(Accepted) StartTransaction.req(Token=123) StartTransaction.conf(TransactionId=15) Session(id=15, token=123, location_id=1234, authorization_reference=567890) 

_Figure 31. START_SESSION whitelist NEVER_ 

Example of a UNLOCK_CONNECTOR that fails because the Location is not known by the CPO. 

eMSP CPO 

 Command(UNLOCK_CONNECTOR, location_id=1234, evse_uid=1234, connector=1) status_code = 2003, data: {CommandResponse { result = REJECTED }} 

 2003 = Unknown Location 

_Figure 32. UNLOCK_CONNECTOR Unknown Location_ 

Example of a RESERVE_NOW that is rejected by the Charge Point. 


 eMSP CPO Charge Point Command(RESERVE_NOW, location_id=1234, token=200, reservationId=ABC123) status_code = 1000, data: {CommandResponse { result = ACCEPTED }} ReserveNow.req(idTag=200, reservationId=456) ReserveNow.conf(Rejected) CommandResult(result = REJECTED) 

_Figure 33. RESERVE_NOW rejected by Charge Point_ 

Example of a successful RESERVE_NOW. 

 eMSP CPO Charge Point 

 Command(RESERVE_NOW, location_id=1234, token=200, reservationId=ABC123, response_url=https://server.com/reservation/ABC123) status_code = 1000, data: {CommandResponse { result = ACCEPTED }} ReserveNow.req(idTag=200, reservationId=456) ReserveNow.conf(Accepted) POST: https://server.com/reservation/ABC123 CommandResult(result = ACCEPTED) 

_Figure 34. Successful RESERVE_NOW_ 

Reservation canceled by the CPO. OCPI makes it possible for a CPO to cancel a reservation. This is not to be taken lightly. When a driver makes a reservation of a Charge Point/EVSE, he/she wants to be sure to have a charging location. So if the CPO cancel the reservation, the driver will for sure not like it. But there are some circumstances where the CPO is forced to cancel a reservation. For example: Charge Point has become defect, or the CPO is notified of ongoing roadworks which makes the Charge Point unreachable etc. 

To Cancel a reservation the CPO call the Senders interface with the same URL as was given by the Sender (eMSP) when the RESERVE_NOW command was send. 

The sequence diagram below continues after the sequence diagram above. 

eMSP CPO 

 Problem with Location 1234 

 POST: https://server.com/reservation/ABC123 CommandResult(result = CANCELED_RESERVATION) 

_Figure 35. Reservation canceled by the CPO_ 

These examples use OCPP 1.6 based commands between CPO and Charge Point, but that is not a requirement for OCPI. 

If the Sender (typically eMSP) wants to have a reference between the calls sent to the Receivers interface and the 


asynchronous result received from the Charge Point via the CPO, the Sender can make some unique identifier part of the`response_url` that is part of every method in the Receiver interface. The Receiver will call this URL when the result is received from the Charge Point. The Sender can then match the unique identifier from the URL called with the request. 

### 13.2. Interfaces and endpoints 

The commands module consists of two interfaces: a Receiver interface that enables a Sender (typically eMSP) (and its clients) to send commands to a Location/EVSE and an Sender interface to receive the response from the Location/EVSE asynchronously. 

###### 13.2.1. Receiver Interface 

Typically implemented by market roles like: CPO. 

Endpoint structure definition: 

{commands_endpoint_url}{command} 

Examples: 

https://www.server.com/ocpi/cpo/2.2.1/commands/START_SESSION 

https://ocpi.server.com/commands/STOP_SESSION 

https://server.com/ocpi/cpo/2.2.1/commands/RESERVE_NOW 

 Method Description 

 GET n/a 

 POST Send a command to the CPO, requesting the CPO to send the command to the Charge Point PUT n/a 

 PATCH n/a 

 DELETE n/a 

**13.2.1.1. POST Method** 

**Request Parameters** 

The following parameter shall be provided as URL segments. 

 Parameter Datatype Requ ired 

 Description 

 command CommandTy pe 

 yes Type of command that is requested. 

**13.2.1.2. Request Body** 

Depending on the command parameter the body SHALL contain the applicable object for that command. 


 Type Card . 

 Description 

 Choice: one of five 

 > CancelReservation 1 CancelReservation object, for the CANCEL_RESERVATION command, with information needed to cancel an existing reservation. 

 > ReserveNow 1 ReserveNow object, for the RESERVE_NOW command, with information needed to reserve a (specific) connector of a Charge Point for a given Token. 

 > StartSession 1 StartSession object, for the START_SESSION command, with information needed to start a sessions. 

 > StopSession 1 StopSession object, for the STOP_SESSION command, with information needed to stop a sessions. 

 > UnlockConnector 1 UnlockConnector object, for the UNLOCK_CONNECTOR command, with information needed to unlock a connector of a Charge Point. 

**Response Data** 

The response contains the direct response from the Receiver, not the response from the Charge Point itself, that will be sent via an asynchronous POST on the Sender interface if this response is ACCEPTED. 

 Datatype Card . 

 Description 

 CommandResponse 1 Result of the command request, by the CPO (not the Charge Point). So this indicates if the CPO understood the command request and was able to send it to the Charge Point. This is not the response by the Charge Point 

###### 13.2.2. Sender Interface 

Typically implemented by market roles like: eMSP. 

The Sender interface receives the asynchronous responses. 

Endpoint structure definition: 

No structure defined. This is open to the Sender to define, the URL is provided to the Receiver by the Sender in the POST to the Receiver interface. Therefor OCPI does not define variables. 

Example: 

https://www.server.com/ocpi/emsp/2.2.1/commands/{command} 

https://ocpi.server.com/commands/{command}/{uid} 

 Method Description 

 GET n/a 

 POST Receive the asynchronous response from the Charge Point. 

 PUT n/a 


 Method Description 

 PATCH n/a 

 DELETE n/a 

**13.2.2.1. POST Method** 

Endpoint structure definition: 

It is up to the implementation of the eMSP to determine what parameters are put in the URL. The eMSP sends a URL in the POST method body to the CPO. The CPO is required to use this URL for the asynchronous response by the Charge Point. It is advised to make this URL unique for every request to differentiate simultaneous commands, for example by adding a unique id as a URL segment. 

Examples: 

https://www.server.com/ocpi/emsp/2.2.1/commands/RESERVE_NOW/1234 

https://www.server.com/ocpi/emsp/2.2.1/commands/UNLOCK_CONNECTOR/2 

**13.2.2.2. Request Body** 

 Datatype Card . 

 Description 

 CommandResult 1 Result of the command request, from the Charge Point. 

### 13.3. Object description 

###### 13.3.1. CancelReservation Object 

With CancelReservation the Sender can request the Cancel of an existing Reservation. The CancelReservation needs to contain the reservation_id that was given by the Sender to the ReserveNow. 

As there might be cost involved for a Reservation, canceling a reservation might still result in a CDR being send for the reservation. 

 Property Type Card . 

 Description 

 response_url URL 1 URL that the CommandResult POST should be sent to. This URL might contain a unique ID to be able to distinguish between CancelReservation requests. 

 reservation_id CiString(36) 1 Reservation id, unique for this reservation. If the Charge Point already has a reservation that matches this reservationId the Charge Point will replace the reservation. 

###### 13.3.2. CommandResponse Object 

The CommandResponse object is send in the HTTP response body. 


Because OCPI does not allow/require retries, it could happen that the asynchronous result url given by the eMSP is never successfully called. The eMSP might have had a glitch, HTTP 500 returned, was offline for a moment etc. For the eMSP to be able to give a quick as possible response to another system or driver app. It is important for the eMSP to know the timeout on a certain command. 

 Property Type Card . 

 Description 

 result CommandResponseType 1 Response from the CPO on the command request. 

 timeout int 1 Timeout for this command in seconds. When the Result is not received within this timeout, the eMSP can assume that the message might never be send. message DisplayText * Human-readable description of the result (if one can be provided), multiple languages can be provided. 

###### 13.3.3. CommandResult Object 

 Property Type Card . 

 Description 

 result CommandResultType 1 Result of the command request as sent by the Charge Point to the CPO. 

 message DisplayText * Human-readable description of the reason (if one can be provided), multiple languages can be provided. 

###### 13.3.4. ReserveNow Object 

The evse_uid is optional. If no EVSE is specified, the Charge Point should keep one EVSE available for the EV Driver identified by the given Token. (This might not be supported by all Charge Points). A reservation can be replaced/updated by sending a RESERVE_NOW request with the same Location (Charge Point) and the same reservation_id. 

A successful reservation will result in a new Session object being created by the CPO. 

An unused Reservation of a Charge Point/EVSE MAY result in cost being made, thus also a CDR. 

The eMSP provides a Token that has to be used by the Charge Point. The Token provided by the eMSP for the ReserveNow SHALL be authorized by the eMSP before sending it to the CPO. Therefor the CPO SHALL NOT check the validity of the Token provided before sending the request to the Charge Point. 

If this is an OCPP Charge Point, the Charge Point decides if it needs to validate the given Token, in such case: 

- If this Token is of type AD_HOC_USER or APP_USER the CPO SHALL NOT do a realtime authorization at the eMSP for     this. 

- If this Token is of type RFID, the CPO SHALL NOT do a realtime authorization at the eMSP for this Token at the     given EVSE/Charge Point within 15 minutes after having received this ReserveNow. 

The eMSP MAY use Tokens that have not been pushed via the Token module. This is especially likely with tokens fof types AD_HOC_USER or APP_USER. Such Tokens are only used in commands sent by an eMSP and never presented locally 


at the Charge Point by a Driver like RFID Tokens. 

Unknown Tokens received by the CPO in the ReserveNow Object don’t need to be stored in the Token module. In other words, when a Token has been received via ReserveNow, the same Token does not have to be returned in a Token GET request from the eMSP. 

An eMSP sending a ReserveNow SHALL only use Tokens that are owned by this eMSP. Using Tokens of other eMSPs is not allowed. 

The reservation_id sent by the Sender (eMSP) to the Receiver (CPO) SHALL NOT be sent directly to a Charge Point. The CPO SHALL make sure the Reservation ID sent to the Charge Point is unique and is not used by another Sender (eMSP). We don’t want a Sender (eMSP) to replace or cancel a reservation of another Sender (eMSP). 

 Property Type Card . 

 Description 

 response_url URL 1 URL that the CommandResult POST should be sent to. This URL might contain a unique ID to be able to distinguish between ReserveNow requests. 

 token Token 1 Token object for how to reserve this Charge Point (and specific EVSE). 

 expiry_date DateTime 1 The Date/Time when this reservation ends, in UTC. 

 reservation_id CiString(36) 1 Reservation id, unique for this reservation. If the Receiver (typically CPO) Point already has a reservation that matches this reservationId for that Location it will replace the reservation. 

 location_id CiString(36) 1 Location.id of the Location (belonging to the CPO this request is sent to) for which to reserve an EVSE. 

 evse_uid CiString(36)? Optional EVSE.uid of the EVSE of this Location if a specific EVSE has to be reserved. 

 authorization_reference CiString(36)? Reference to the authorization given by the eMSP, when given, this reference will be provided in the relevant Session and/or CDR. 

###### 13.3.5. StartSession Object 

The evse_uid is optional. If no EVSE is specified, the Charge Point can itself decide on which EVSE to start a new session. (this might not be supported by all Charge Points). 

The eMSP provides a Token that has to be used by the Charge Point. The Token provided by the eMSP for the StartSession SHALL be authorized by the eMSP before sending it to the CPO. Therefor the CPO SHALL NOT check the validity of the Token provided before sending the request to the Charge Point. 

If this is an OCPP Charge Point, the Charge Point decides if it needs to validate the given Token, in such case: 

- If this Token is of type: AD_HOC_USER or APP_USER the CPO SHALL NOT do a realtime authorization at the eMSP for     this. 

- If this Token is of type: RFID, the CPO SHALL NOT do a realtime authorization at the eMSP for this Token at the 


 given EVSE/Charge Point within 15 minutes after having received this StartSession. (This means that if the driver decided to use his RFID within 15 minutes at the same Charge Point, because the app is not working somehow, the RFID is already authorized) 

The eMSP MAY use Tokens that have not been pushed via the Token module, especially AD_HOC_USER or APP_USER Tokens are only used by commands send by an eMSP. As these are never used locally at the Charge Point like RFID. 

Unknown Tokens received by the CPO in the StartSession Object don’t need to be stored in the Token module. In other words, when a Token has been received via StartSession, the same Token does not have to be returned in a Token GET request from the eMSP. However, the information of the Token SHALL be put in the Session and CDR. 

An eMSP sending a StartSession SHALL only use Token that are owned by this eMSP in StartSession, using Tokens of other eMSPs is not allowed. 

 Property Type Card . 

 Description 

 response_url URL 1 URL that the CommandResult POST should be sent to. This URL might contain a unique ID to be able to distinguish between StartSession requests. 

 token Token 1 Token object the Charge Point has to use to start a new session. The Token provided in this request is authorized by the eMSP. 

 location_id CiString(36) 1 Location.id of the Location (belonging to the CPO this request is sent to) on which a session is to be started. 

 evse_uid CiString(36)? Optional EVSE.uid of the EVSE of this Location on which a session is to be started. Required when connector_id is set. 

 connector_id CiString(36)? Optional Connector.id of the Connector of the EVSE on which a session is to be started. This field is required when the capability: START_SESSION_CONNECTOR_REQUIRED is set on the EVSE. 

 authorization_reference CiString(36)? Reference to the authorization given by the eMSP, when given, this reference will be provided in the relevant Session and/or CDR. 

 NOTE 

 In case of an OCPP 1.x Charge Point, the EVSE ID should be mapped to the connector ID of a Charge Point. OCPP 1.x does not have good support for Charge Points that have multiple connectors per EVSE. To make StartSession over OCPI work, the CPO SHOULD present the different connectors of an EVSE as separate EVSE, as is also written by the OCA in the application note: "Multiple Connectors per EVSE in a OCPP 1.x implementation". 

###### 13.3.6. StopSession Object 

 Property Type Card . 

 Description 

 response_url URL 1 URL that the CommandResult POST should be sent to. This URL might contain a unique ID to be able to distinguish between StopSession requests. 


 Property Type Card . 

 Description 

 session_id CiString(36) 1 Session.id of the Session that is requested to be stopped. 

###### 13.3.7. UnlockConnector Object 

 Property Type Card . 

 Description 

 response_url URL 1 URL that the CommandResult POST should be sent to. This URL might contain a unique ID to be able to distinguish between UnlockConnector requests. 

 location_id CiString(36) 1 Location.id of the Location (belonging to the CPO this request is sent to) of which it is requested to unlock the connector. 

 evse_uid CiString(36) 1 EVSE.uid of the EVSE of this Location of which it is requested to unlock the connector. 

 connector_id CiString(36) 1 Connector.id of the Connector of this Location of which it is requested to unlock. 

### 13.4. Data types 

###### 13.4.1. CommandResponseType enum 

Response to the command request from the eMSP to the CPO. 

 Value Description 

 NOT_SUPPORTED The requested command is not supported by this CPO, Charge Point, EVSE etc. 

 REJECTED Command request rejected by the CPO. (Session might not be from a customer of the eMSP that send this request) 

 ACCEPTED Command request accepted by the CPO. 

 UNKNOWN_SESSION The Session in the requested command is not known by this CPO. 

###### 13.4.2. CommandResultType enum 

Result of the command that was sent to the Charge Point. 

 Value Description 

 ACCEPTED Command request accepted by the Charge Point. 

 CANCELED_RESERVATION The Reservation has been canceled by the CPO. EVSE_OCCUPIED EVSE is currently occupied, another session is ongoing. Cannot start a new session 

 EVSE_INOPERATIVE EVSE is currently inoperative or faulted. 


 Value Description 

 FAILED Execution of the command failed at the Charge Point. 

 NOT_SUPPORTED The requested command is not supported by this Charge Point, EVSE etc. 

 REJECTED Command request rejected by the Charge Point. 

 TIMEOUT Command request timeout, no response received from the Charge Point in a reasonable time. 

 UNKNOWN_RESERVATION The Reservation in the requested command is not known by this Charge Point. 

###### 13.4.3. CommandType enum 

The command requested. 

 Value Description 

 CANCEL_RESERVATION Request the Charge Point to cancel a specific reservation. 

 RESERVE_NOW Request the Charge Point to reserve a (specific) EVSE for a Token for a certain time, starting now. 

 START_SESSION Request the Charge Point to start a transaction on the given EVSE/Connector. 

 STOP_SESSION Request the Charge Point to stop an ongoing session. 

 UNLOCK_CONNECTOR Request the Charge Point to unlock the connector (if applicable). This functionality is for help desk operators only! 

**The command UNLOCK_CONNECTOR may only be used by an operator or the eMSP. This command SHALL never be allowed to be sent directly by the EV-Driver. The UNLOCK_CONNECTOR is intended to be used in the rare situation that the connector is not unlocked successfully after a transaction is stopped. The mechanical unlock of the lock mechanism might get stuck, for example: fail when there is tension on the charging cable when the Charge Point tries to unlock the connector. In such a situation the EV-Driver can call either the CPO or the eMSP to retry the unlocking.**
