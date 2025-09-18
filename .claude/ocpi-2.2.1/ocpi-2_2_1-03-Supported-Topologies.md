## 3. Supported Topologies 

OCPI started as a bilateral protocol, for peer-to-peer communication. Soon parties started to use OCPI via Hubs, but OCPI 2.1.1 and earlier were not designed for that. OCPI 2.2 introduced a solution for this: message routing. 

OCPI 2.2 introduced Platforms that connect via OCPI instead of CPO and eMSP, more on this in: EV Charging Market Roles 

### 3.1. Peer-to-peer 

The simplest topology is a bilateral connection: peer-to-peer between two platforms, and in the most simple version each platform only has 1 role. 

**PLATFORM PLATFORM** 

eMSP CPO 

 OCPI 

_Figure 2. peer-to-peer topology example_ 

### 3.2. Multiple peer-to-peer connections 

A more real-world topology where multiple parties connect their platforms and each platform only has 1 role. (Not every party necessarily connects with all the other parties with the other role). 

 PLATFORM PLATFORM PLATFORM PLATFORM 

 PLATFORM PLATFORM PLATFORM 

 eMSP1 eMSP3 eMSP2 eMSP4 

 CPO2 CPO1 CPO3 

 OCPI OCPI 

_Figure 3. Multiple peer-to-peer topology example_ 


### 3.3. Peer-to-peer multiple the same roles 

Some parties provide for example CPO or eMSP services for other companies. So the platform hosts multiple parties with the same role. This topology is a bilateral connection: peer-to-peer between two platforms, and both platforms can have multiple roles. 

**PLATFORM** (^) **PLATFORM** eMSP1 eMSP2 eMSP3 CPO1 CPO2 OCPI _Figure 4. peer-to-peer with multiple roles topology example_ 

### 3.4. Peer-to-peer dual roles 

Some parties have dual roles, most of the companies are CPO and eMSP. This topology is a bilateral connection: peerto-peer between two platforms, and both platforms have the CPO and the eMSP roles. 

 PLATFORM PLATFORM 

eMSP1 

CPO1 

eMSP2 

CPO2 

 OCPI 

_Figure 5. peer-to-peer with both CPO and eMSP roles topology example_ 


### 3.5. Peer-to-peer mixed roles 

Some parties have dual roles, or provide them to other parties and then connect to other companies that do the same. This topology is a bilateral connection: peer-to-peer between two platforms, and both platforms have multiple different and also the same roles. 

**PLATFORM PLATFORM** 

eMSP1 

eMSP2 

CPO1 

CPO2 

eMSP4 

CPO5 

CPO6 

CPO7 

 OCPI 

_Figure 6. peer-to-peer with mixed roles topology example_ 


### 3.6. Multiple peer-to-peer 

More a real-world topology when OCPI is used between market parties without a hub, all parties are platforms with multiple roles. 

Disadvantage of this: requires a lot of connections between platforms to be setup, tested and maintained. 

##### PLATFORM 

##### PLATFORM 

##### PLATFORM 

##### PLATFORM 

##### eMSP1 

##### eMSP2 

##### CPO1 

##### CPO2 

##### eMSP3 

##### CPO3 

##### eMSP4 

##### CPO4 

##### OCPI 

##### OCPI 

##### OCPI 

##### OCPI 

##### OCPI 

_Figure 7. peer-to-peer with mixed roles topology example_ 


### 3.7. Platforms via Hub 

This topology has all Platforms only connect via a Hub, all communication goes via the Hub. 

**PLATFORM** 

**PLATFORM** 

**PLATFORM** 

**PLATFORM** 

**PLATFORM** 

**PLATFORM** 

**PLATFORM** 

eMSP1 

eMSP2 

eMSP3 

eMSP4 

eMSP5 

CPO1 

CPO2 

CPO3 

CPO4 

CPO5 

Hub 

 OCPI 

 OCPI 

 OCPI 

 OCPI 

 OCPI 

 OCPI 

_Figure 8. Platforms connected via a Hub topology example_ 


### 3.8. Platforms via Hub and direct 

Not all Platforms will only communicate via a Hub. There might be different reasons for Platforms to still have peerto-peer connections. The Hub might not yet support new functionality. The Platforms use a custom module for some new project, which is not supported by the Hub. etc. 

**PLATFORM** 

**PLATFORM** 

**PLATFORM** 

**PLATFORM** 

**PLATFORM** 

**PLATFORM** 

**PLATFORM** 

eMSP1 

eMSP2 

eMSP3 

eMSP4 

eMSP5 

CPO1 

CPO2 

CPO3 

CPO4 

CPO5 

Hub 

 OCPI 

 OCPI 

 OCPI 

 OCPI 

 OCPI 

 OCPI 

 OCPI 

 OCPI 

_Figure 9. Platforms connected via a Hub and directly topology example_
