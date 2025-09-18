## 15. HubClientInfo module 

**Module Identifier: hubclientinfo** 

**Data owner: Hub** 

**Type:** Configuration Module 

This module provides parties connected to a hub with the connection status of other parties that are connected to a hub that they can communicate with. So, CPOs know which eMSP and other parties are online and vice versa. 

Unlike the usual OCPI modules, this module is between eMSP/CPO and Hub instead of between eMSP and CPO. 

### 15.1. Scenarios 

This section will describe what the expected behavior is when a party receives information of a ConnectionState change. 

###### 15.1.1. Another Party becomes CONNECTED 

Party is (back) online. Request can be sent again. Every party receiving Client Owned Objects from this party should be prepared to receive Client Owned Objects with URLs that contain the party_id and country_code of this party. 

###### 15.1.2. Another Party goes OFFLINE 

Connection to party is not available: No requests can be sent. Do not queue Push messages. When the other party comes back online, it is their responsibility to do a GET to get back in sync. 

###### 15.1.3. Another Party becomes PLANNED 

No requests can be sent to this new party yet. It can be a good idea to sent some notification to an operator to get into contact with the new party so contracts can be setup. This state may also be used when a Hub has some configuration indicating which parties have contracts which each other. When a company does not have a connection configured, this state may also be sent to parties. 

###### 15.1.4. Another Party becomes SUSPENDED 

Like with OFFLINE, no requests should be sent to this party, they cannot be delivered. 

When, for example, CDRs still have to be delivered (there is some unfinished business) parties are advised to get into contact with the other party in some other way: call them, or send an e-mail. 

### 15.2. Flow and Life-cycle 

###### 15.2.1. Push model 

When the Hub creates a new ClientInfo object they push it to the connected parties by calling PUT on the connected party ClientInfo endpoint with the newly created ClientInfo object. 


Any changes to ClientInfo in the Hub system are sent to the connected party system by calling the PUT method on the connected party ClientInfo endpoint with the updated ClientInfo. 

When the Hub invalidates a ClientInfo object (deleting is not possible), the Hub will send the updated ClientInfo object (with the field: status set to SUSPENDED, by calling the PUT method on the connected party ClientInfo endpoint with the updated ClientInfo object. 

When the connected party is not sure about the state or existence of a ClientInfo object in the Hub system, the connected party can call the GET to request to ClientInfo object from the Hub system. 

###### 15.2.2. Pull model 

When a connected party is not sure about the state of the list of known connected parties of a Hub, or wants to request the full list at the start-up of their system, the connected party can call the GET on the Hubs ClientInfo endpoint to receive all ClientInfo objects. This method is not for operational flow. 

###### 15.2.3. Still alive check. 

The hubs needs to determine if a connection is still "alive". 

To do this, the Hub should keep track of the time that has passed since the last message was received from a connected party. When this is longer then X minutes (when unsure, start with 5 minutes) the Hub should send a: GET to the Version information endpoint. As the Version information endpoint is always required in OCPI, and this endpoint is provided by all parties, and a GET to the versions endpoint does not have any side effects, this is seen as the best way to do an "still-alive"check. 

### 15.3. Interfaces 

There is both a Sender (Typically Hub) as a Receiver interface for ClientInfo. It is advised to use the Push direction from Sender to connected clients during normal operation. The Hub interface is meant to be used when the connected client is not 100% sure the ClientInfo cache is still correct. 

###### 15.3.1. Receiver Interface 

Typically implemented by all parties connecting to a Hub. 

With this interface the Hub can push the ClientInfo information to a connected client (eMSP/CPO etc) Example endpoint structure: /ocpi/cpo/2.0/clientinfo/{country_code}/{party_id} 

 Method Description 

 GET Retrieve a ClientInfo object as it is stored in the connected clients system. 

 POST n/a PUT Push new/updated ClientInfo object to the connect client. 

 PATCH n/a 

 DELETE n/a, Use PUT, ClientInfo objects cannot be removed). 


**15.3.1.1. GET Method** 

If the Hub wants to check the status of a ClientInfo object in the connected clients system it might GET the object from the connected clients system for validation purposes. The Hub is the owner of the objects, so it would be illogical if the connected client system had a different status or was missing an object. 

**Request Parameters** 

The following parameters shall be provided as URL segments. 

 Parameter Datatype Requ ired 

 Description 

 country_code CiString(2) yes Country code of the requested ClientInfo object. 

 party_id CiString(3) yes Party ID (Provider ID) of the requested ClientInfo object. 

**Response Data** 

The response contains the requested object. 

 Type Card. Description 

 ClientInfo 1 The requested ClientInfo object. 

**15.3.1.2. PUT Method** 

New or updated ClientInfo objects are pushed from the Hub to a connected client. 

**Request Body** 

In the put request a the new or updated ClientInfo object is send. 

 Type Card. Description 

 ClientInfo 1 New or updated ClientInfo object. 

**Request Parameters** 

The following parameters shall be provided as URL segments. 

 Parameter Datatype Required Description 

 country_code CiString(2) yes Country code of the eMSP sending this PUT request to the CPO system. 

 party_id CiString(3) yes Party ID (Provider ID) of the eMSP sending this PUT request to the CPO system. 

**Example: put a new ClientInfo object** 


 PUT To URL: https://www.server.com/ocpi/cpo/2.0/clientinfo/NL/ALL { "country_code": "NL", "party_id": "ALL", "role": "CPO", "status": "PLANNED", } 

###### 15.3.2. Sender Interface 

Typically implemented by the Hub. 

This interface enables Receivers to request the current list of ClientInfo objects from the Sender, when needed. 

 Method Description 

 GET Get the list of known ClientInfo objects, last updated between the {date_from} and {date_to} paginated) 

 POST n/a 

 PUT n/a 

 PATCH n/a 

 DELETE n/a 

**15.3.2.1. GET Method** 

Fetch information about clients connected to a Hub. 

Endpoint structure definition: 

{locations_endpoint_url}?[date_from={date_from}]&[date_to={date_to}]&[offset={offset}]&[limit={limit}] 

Examples: 

https://www.server.com/ocpi/cpo/2.2.1/hubclientinfo/?date_from=2019-01-28T12:00:00&date_to=2019-01-29T12:00:00 

https://ocpi.server.com/2.2.1/hubclientinfo/?offset=50 

https://www.server.com/ocpi/2.2.1/hubclientinfo/?date_from=2019-01-29T12:00:00&limit=100 

https://www.server.com/ocpi/cpo/2.2.1/hubclientinfo/?offset=50&limit=100 

**15.3.2.2. Request Parameters** 

If additional parameters: {date_from} and/or {date_to} are provided, only ClientInfo objects with (last_updated) between the given {date_from} (including) and {date_to} (excluding) will be returned. 

This request is paginated, it supports the pagination related URL parameters. 


 Parameter Datatype Requ ired 

 Description 

 date_from DateTime no Only return ClientInfo that have last_updated after or equal to this Date/Time (inclusive). 

 date_to DateTime no Only return ClientInfo that have last_updated up to this Date/Time, but not including (exclusive). 

 offset int no The offset of the first object returned. Default is 0. 

 limit int no Maximum number of objects to GET. 

**15.3.2.3. Response Data** 

The endpoint response with list of valid ClientInfo objects, the header will contain the pagination related headers. 

Any older information that is not specified in the response is considered as no longer valid. Each object must contain all required fields. Fields that are not specified may be considered as null values. 

 Type Card. Description 

 ClientInfo * List of all (or matching) ClientInfo objects. 

### 15.4. Object description 

###### 15.4.1. ClientInfo Object 

 Property Type Card . 

 Description 

 party_id CiString(3) 1 CPO or eMSP ID of this party (following the 15118 ISO standard), as used in the credentials exchange. 

 country_code CiString(2) 1 Country code of the country this party is operating in, as used in the credentials exchange. 

 role Role 1 The role of the connected party. 

 status ConnectionStatus 1 Status of the connection to the party. 

 last_updated DateTime 1 Timestamp when this ClientInfo object was last updated. 

### 15.5. Data types 

###### 15.5.1. ConnectionStatus enum 

 Value Description 

 CONNECTED Party is connected. 

 OFFLINE Party is currently not connected. 


**Value Description** 

PLANNED Connection to this party is planned, but has never been connected. 

SUSPENDED Party is now longer active, will never connect anymore.
