## 2. Terminology and Definitions 

### 2.1. Requirement Keywords 

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in https://www.ietf.org/rfc/rfc2119.txt. 

### 2.2. Abbreviations 

 Abbr. Description 

 CDR Charge Detail Record. 

 CPO Charging Point Operator. 

 eMSP e-Mobility Service Provider. 

 EV Electric Vehicle. EVSE Electric Vehicle Supply Equipment. Is considered as an independently operated and managed part of a Charge Point that can deliver energy to one EV at a time. 

 JSON JavaScript Object Notation. 

 NAP National Access Point. 

 NSP Navigation Service Provider. 

 OCPP Open Charge Point Protocol. 

 SCSP Smart Charging Service Provider. 

### 2.3. EV Charging Market Roles 

In the EV Charging landscape, different market roles can be identified. 

 Role Description 

 CPO Charging Point Operator. Operates a network of Charge Points. 

 eMSP e-Mobility Service Provider. Gives EV drivers access to charging services. 

 Hub Can connect one or more CPOs to one or more eMSPs. 

 NAP National Access Point. Provides a national database with all (public) charging locations. Information can be sent and retrieved from the NAP. This makes it different from a typical NSP. 

 NSP Navigation Service Provider. Provides EV drivers with location information of Charge Points. Usually only interested in Location information. 

 Roaming Hub See: Hub. 


 Role Description 

 SCSP Smart Charging Service Provider. Provides Smart Charging service to other parties. Might use a lot of different inputs to calculate Smart Charging Profiles. 

Some of these roles can be combined in one company. A Platform can provide service for multiple CPOs or eMSPs, but also for both eMSPs and CPOs. 

OCPI 2.0 and OCPI 2.1.1 had a very strict definition of roles: only CPO and eMSP. But this is rare in the real world, there are almost no parties that are strictly CPO or eMSP and have their own platform. In the real world, lots of parties provide service to CPOs that are not running their own platform. A lot of CPOs are also eMSP. With OCPI 2.1.1 and earlier that meant having to set up an OCPI connection per role. 

OCPI 2.2 introduced more roles and abstracts the role from the OCPI connection itself. OCPI 2.2 and OCPI 2.2.1 are described in terms of about Platforms connecting to Platforms, or Platforms connecting via Hubs to other Platforms. The Platform itself is not a role. The Platform provides services for 1 or more roles. 

Examples of platforms: 

- A pure CPO: Not providing services to other CPOs. Not being an eMSP. Running its own software that connects     via OCPI.     Is defined in OCPI as a Platform has 1 CPO role, the CPO role of that company. 

- A Company that has a cloud-based eMSP software solution, it offers to companies that want to be eMSP, but     don’t want to host/run their own software.     Is a Platform that has a number of eMSP roles, one for each eMSP the company is providing services for. Not for     this company itself because the company itself is not an eMSP. 

- A Company that operates public Charge Points and also provides eMSP service to EV drivers, running their own     software platform.     Is seen in OCPI as a Platform that has 2 roles: CPO and eMSP for this company. 

- If one the companies above starts to offer their service to other CPOs and eMSP, it is in OCPI still seen as 1     platform. This platform then provides multiple CPO and eMSP roles. 

- A Roaming Hub is in OCPI terms also a Platform, antoher OCPI Platform can connect to it. Most Roamings Hubs     only have one role: Hub. 

###### 2.3.1. Typical OCPI implementations per Role 

The following table shows the typical modules implemented by the different roles. These are not required. The table shows the typical communication role: Receiver, Sender or Both. 

 Modules CPO eMSP Hub NSP NAP SCSP 

 CDRs Sender Receiver Both Charging Profiles Receiver Both Sender 

 Commands Receiver Sender Both 

 Credentials Both Both Both Both Both Both 

 Hub Client Info Receiver Receiver Sender Receiver Receiver Receiver 

 Locations Sender Receiver Both Receiver Both 


 Modules CPO eMSP Hub NSP NAP SCSP 

 Sessions Sender Receiver Both Receiver 

 Tariffs Sender Receiver Both Receiver Both 

 Tokens Receiver Sender Both 

 Versions Both Both Both Both Both Both 

### 2.4. Terminology 

 Term Description 

 Broadcast Push When communicating via a Hub, a data owner can do a single call to the Hub, the Hub then calls all receiving systems. See: Broadcast push 

 Charge Point The physical system where an EV can be charged. A Charge Point has one or more EVSEs. Sometimes called Charging Station Client Owned Objects In a normal REST interface the server is the owner of data, when a new resource is created by calling POST, the server creates the URL where the resource can be found by a client. OCPI is different, in most modules the owner is the party pushing data to a server, to inform them of updates. For example Locations, the CPO owns a Location (Charge Point), when a new Charge Point is added, the CPO calls PUT on the eMSP systems to inform them about new locations. See: Client Owned Objects 

 Configuration Module OCPI Module needed to setup and maintain OCPI connections, but does not provide information for the EV driver: Credentials, Versions and Hub Client Info. Configuration Modules do NOT use message routing. 

 Functional Module OCPI Module that provides functionality/information for the EV Driver, such as: Tokens, Locations, CDRs etc. Functional Modules use message routing. 

 Open Routing Request This is for Platforms that are connected via a Hub. When a system sends a pull request to the Hub, and does not know, or care about, the owner of information, but asks the Hub to route the GET to the correct Platform. The Hub finds the correct Platform and routes the request to that Platform. See: Open Routing Request 

 Platform Software that provides services via OCPI. A platform can provide service for a single eMSP or CPO, or for multiple CPOs or eMSPs. It can even provide services for both eMSPs and CPOs at the same time. A Hub is also an OCPI Platform, most only have one role: Hub. 

 Pull A system calls GET request to retrieve information from the system that owns the data. 

 Push The system (owning the data) actively calls POST/PUT/PATCH to update other systems with new/updated information. 


### 2.5. Provider and Operator abbreviation 

In OCPI it is advised to use eMI3 compliant names for Contract IDs and EVSE IDs. The provider and the operator name is important here, to target the right provider or operator, they need to be known upfront, at least between the cooperating parties. 

In several standards, an issuing authority is mentioned that will keep a central registry of known Providers and Operators. At this moment, the following countries have an authority that keeps track of the known providers and operators: 

###### 2.5.1. The Netherlands, Belgium and Luxembourg (BeNeLux) 

Benelux IDRO keeps the registry for The Netherlands, Belgium and Luxembourg. 

- The list of operator IDs and provider IDs can be viewed on their website ID-register. 

###### 2.5.2. Germany 

The BDEW organisation keeps the registry for Germany in their general code number service bdew-codes.de. 

- Provider ID List See https://bdew-codes.de/Codenumbers/EMobilityId/ProviderIdList 

- EVSE Operator ID List See https://bdew-codes.de/Codenumbers/EMobilityId/OperatorIdList 

###### 2.5.3. Austria 

Austrian Mobile Power GmbH maintains a registry for Austria. This list is not publicly available. For more information visit austrian-mobile-power.at 

###### 2.5.4. France 

The AFIREV* organization will keep/keeps the registry for France. It provides operation Id for CPO and eMSP in compliance with eMI3 id structure. The prefix of these Ids is the “fr” country code. AFIREV will also be in charge of the definition of EVSE-Id structure, Charging-Pool-Id structure (location), and Contract-Id structure for France. AFIREV bases its requirements and recommendations on eMI3 definitions. 

AFIREV stands for: Association Française pour l’Itinérance de la Recharge Électrique des Véhicules 

###### 2.5.5. Hungary 

The Hungarian ID Registration Office keeps the register for Hungary. 

The list of all registered organizations can be found on their website. 

###### 2.5.6. Poland 

EIPA (Ewidencja Infrastruktury Paliw Alternatywnych) is a government organization that keeps the register for Poland. 


###### 2.5.7. UK 

EV Roam is the first register of e-mobility IDs for Chargepoint Operators (CPO) and e-Mobility Service Providers (MSP) in the UK. 

Their website shows the full list of currently registered organizations. 

### 2.6. Charging topology 

The charging topology, as relevant to the eMSP, consists of three entities: 

- _Connector_ is a specific socket or cable available for the EV to make use of. 

- _EVSE_ is the part that controls the power supply to a single EV in a single session. An EVSE may provide multiple     connectors but only one of these can be active at the same time. 

- _Location_ is a group of one or more EVSEs that belong together geographically or spatially. 

 EVSE A3 

 EVSE A2 

 EVSE A1 

 Location A 

 EVSE B1 

 Location B 

 EVSE B4 

 Connectors 

 EVSE B3 

 Connectors 

 EVSE B2 

_Figure 1. Charging Topology schematic_ 

A Location is typically the exact location of one or more EVSEs, but it can also be the entrance of a parking garage or a gated community. It is up to the CPO to use whatever makes the most sense in a specific situation. Once arrived at the location, any further instructions to reach the EVSE from the Location are stored in the EVSE object itself (such as the floor number, visual identification or manual instructions). 

### 2.7. Variable names 

To prevent issues with capitals in variable names, the naming in JSON is not CamelCase but snake_case. All variables are lowercase and include an underscore for a whitespace. 


### 2.8. Cardinality 

When defining the cardinality of a field, the following symbols are used throughout this document: 

 Symbol Description Type 

 ? An optional object. If not set, it might be null, or the field might be omitted. When the field is set to null or omitted and it has a default value, the value is the default value. 

 Object 

 1 Required object. Object 

 * A list of zero or more objects. If empty, it might be null, [] or the field might be omitted. [Object] 

 + A list of at least one object. [Object] 

### 2.9. Data Retention 

OCPI does not specify how long a system should store data. Companies are RECOMMENDED to make this part of business contracts. Parties also will need to oblige to local legislation. 

###### 2.9.1. Between OCPI version 

When a new version of OCPI is implemented, the data exchanged via the old version does not have to be available via the newer version of OCPI. Hence, the Version end-point will probably have different end-points per version. So when an object is stored with a URL that contains a version, it is NOT REQUIRED to be available at a URL with a different version number.
