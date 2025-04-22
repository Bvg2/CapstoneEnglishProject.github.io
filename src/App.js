import styles from "./App.module.css";
import React, { useEffect, useState, useRef, Image } from "react";
import "@arcgis/map-components"; // Import the web componentsimport Map from "@arcgis/core/Map.js";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import WebMap from "@arcgis/core/WebMap.js";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import esriRequest from "@arcgis/core/request.js";

import "@arcgis/map-components/dist/components/arcgis-map";

function App() {
  var featureLayer = null;
  var view = null;
  const mapRef = useRef();
  const [features, setFeatures] = useState(null);
  const [date, setDate] = useState("1900-1-1");
  const [name, setName] = useState("");
  const [time, setTime] = useState("");
  let [isOpen, setIsOpen] = useState(false);
  let [isOpenButton, setIsOpenButton] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [savedAtt, setSavedAtt] = useState(null);
  const [feat, setFeat] = useState(null);
  const [savedGraphic, setSavedGraphic] = useState(null);
  const [dangerStreet, setDangerStreet] = useState(false);
  const [dataBundle, setDataBundle] = useState(
    {
      name: '',
      Groupname: '',
      reserved: null,
      date: '',
      time: '',
      condition: null,
    });

  //save the current attribute into use state when its clicked on this is from 4-12-25

  useEffect(() => {
    const testAccess = async () => {
      const map = new Map({
        basemap: "topo-vector",
      });

      // Create the MapView
      view = new MapView({
        container: mapRef.current,
        map: map,
        center: [-79.956447, 40.433655], // longitude, latitude
        zoom: 15,
      });

      // Add a Feature Layer (data access example)
      featureLayer = new FeatureLayer({
        url: "https://services7.arcgis.com/arZnhQhtvIXpgVPD/arcgis/rest/services/FinalFieldsCapMap/FeatureServer",
        outFields: ["*"]
      });
      setFeat(featureLayer);

      //featureLayer.definitionExpression = "Condition = 50";
      map.add(featureLayer);


      view.when(() => {
        // 👆 Set up click handler
        view.on("click", async (event) => {
          const response = await view.hitTest(event);

          if (response.results.length) {
            const graphic = response.results.find(r =>
              r.graphic.layer === featureLayer
            )?.graphic;

            setSavedGraphic(graphic);

            if (graphic) {
              const attributes = graphic.attributes;
              console.log("Feature clicked:", attributes);
              //  attributes.ResDate = "2025-02-29";
              featureLayer.applyEdits({
                updateFeatures: [graphic]
              })
              //alert(`Feature clicked:\n${JSON.stringify(attributes, null, 2)}`);
              setDataBundle({
                name: attributes.name,
                Groupname: attributes.Vol_Group,
                reserved: attributes.Reserved,
                date: attributes.ResDate,
                time: attributes.ResTime,
                condition: attributes.Condition,
              });

              //Handle Determining if busy
              const speed = attributes.speedlimit;
              const lanes = attributes.num_lanes;
              const rdWidth = attributes.roadwidth;
              //numlanes ^ roadwidth v speedlimit ^

              if((((speed/35)*2 + (1-(rdWidth/64)) + (lanes/4))/4)>(0.6)){
                //alert("possibly Dangerous")
                setDangerStreet(true);
              }
              else{
                setDangerStreet(false);
              }

              





              setSavedAtt(attributes);
              // You can also update a React state here to show in a custom UI
              featureLayer.load().then(() => {

                // Reset to the default renderer from the service
                featureLayer.refresh();
              });
            }
          }
        });
      });



      return () => {
        if (view) {
          view.destroy();
        }
      };

    };

    const getDate = () => {
      var currentTime = new Date()

      // returns the month (from 0 to 11)
      var month = currentTime.getMonth() + 1
      console.log("month" + month);
      if (month < 10) {
        month = "0" + month;

      }

      // returns the day of the month (from 1 to 31)
      var day = currentTime.getDate()

      // returns the year (four digits)
      var year = currentTime.getFullYear()

      // write output MM/dd/yyyy
      setDate(year + "-" + month + "-" + day);

    }

    const timeUpkeep = () => {
      var currentTime = new Date();
      //console.log("today's date is: " + currentTime);


      featureLayer.queryFeatures({
        where: "1=1",
        outFields: ["*"],
        returnGeometry: true
      }).then((results) => {
        const graphics = results.features;
        graphics.forEach((graphic) => {
          var atts = graphic.attributes;
          // Each graphic = real rendered feature in the view
          const graphicDate = graphic.attributes.ResDate;
          const graphicTime = graphic.attributes.ResTime;
          //make ,name,reserved,condition null,null,name
          //console.log("this graphics" + JSON.stringify(graphic.attributes.ResDate));
          const tempDate = new Date(`${graphicDate}T${graphicTime}`);
          //console.log(tempDate);



          


          //if the temp date is behind the current one then you remove it. 
          if (tempDate) {
            if (tempDate < currentTime) {
              //console.log("this has already happened" + " " + tempDate + " " + currentTime);
              atts.Vol_Group = "";
              atts.Condition = 100;
              atts.Reserved = 0;
              //console.log("refreshing");



            }
            else {
              //console.log("this has not happened yet" + " " + tempDate + " " + currentTime)
            }
          }

          //find the correct condition to set the date to given how many days its been since last clean. 
          if (atts.Reserved == 0) {
            //console.log(atts.ResTime);
            if (currentTime > tempDate) {
              const timeDiff = Math.abs(currentTime - tempDate);
              const daysDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24));

              //console.log("days for " + atts.name + " " + daysDiff);

              atts.Condition = (100 - (3.333 * daysDiff));
              if (atts.Condition < 0) {
                atts.Condition = 0;
              }
            }
          }
          //if tempdate > todays date; set variabels to 0 
        });
        //console.log("applying");
        featureLayer.applyEdits({
          updateFeatures: graphics
        }).then((result) => {
          //console.log("ApplyEdits result:", result);
          featureLayer.refresh(); // Optional, if changes aren't auto-updating
        }).catch((err) => {
          //console.error("applyEdits error:", err);
        });
      });

    }


    //NEED A METHOD THAT LOWERS STREET CLEANING BY 1 EVERYDAY
    //to see when it has been last cleaned do not null the cleaned date just keep it normal. then that is the last day it has been cleaned 

    getDate();
    testAccess()
    timeUpkeep();


  }, []);

  const handleChange = (event) => {
    let inputDate = event.target.value;
    setDate(inputDate);

  }
  function handleClick() {
    setIsOpen(!isOpen);
  }
  function handleClickLiability() {
    setIsOpenButton(!isOpenButton);
  }
  function dataSubmit() {

    if (savedAtt.Reserved == 1) {
      alert(`you cant reserve ${savedAtt.name} becasue its already reserved`);
    }
    savedAtt.Vol_Group = name;
    savedAtt.Reserved = 1;
    savedAtt.ResDate = date;
    savedAtt.ResTime = time;
    setDangerStreet(false);




    feat.applyEdits({
      updateFeatures: [savedGraphic]
    })

    feat.load().then(() => {
      // Reset to the default renderer from the service
      feat.refresh();
    });

  }


  return (

    <div>

      <div>
        <h1 className={styles.title}>South Oakland Cleanup </h1>
      </div>
      <div className={styles.map}>

        <div ref={mapRef} className={styles.holderMap}></div>

      </div>

      <div className={styles.legend}>
        <h2>Key:</h2>
        <div className={styles.key}>
          <h3>Good</h3>
          <div className={styles.good}></div>
        </div>
        <div className={styles.key}>
          <h3>Average</h3>
          <div className={styles.average}></div>
        </div>
        <div className={styles.key}>
          <h3>Poor</h3>
          <div className={styles.bad}></div>
        </div>
      </div>

      <div className={styles.groupInput}>
        <div className={styles.formDiv}>
          <h1>User Information</h1>
          <form>

            <input type="text" name="groupName" placeholder="Name Input" className={styles.inputForm} onChange={(e) => setName(e.target.value)} />
            <input type="date" name="trip-start" value={date} min={`${date.substring(0, 4)}-01-01`} max={`${date.substring(0, 4)}-12-31`} onChange={handleChange} />
            <input type="time" name="time" placeholder="Input a Time (example: 5:30)" className={styles.timeInput} onChange={(e) => setTime(e.target.value)} />

            <button disabled={!isChecked} className={styles.submitButton} onClick={dataSubmit} type="submit"> Send Data</button>
          </form>
        </div>
        <div className={styles.mapData}>
          <h3>Street Data: {dataBundle.name}</h3>
          <div className={styles.dataList}>
            <p><b>group</b>: {dataBundle.Groupname}</p>
            <p><b>Condition</b>: {dataBundle.condition}</p>
            <p><b>Reserved</b>: {dataBundle.reserved ? "yes" : "no"}</p>
            <p><b>Date Reserved</b>: {dataBundle.date}</p>
            <p><b>Time Reserved</b>: {dataBundle.time}</p>
            {dangerStreet && <p style={{backgroundColor:"red", width: 180, display:"inline-block", color:"white", padding:5, margin:5}}><b>!This Street may be potentially dangerous!</b></p>}
          </div>


          <div>
            <button className={styles.waiverButton} onClick={handleClickLiability}>Fill Out Waiver</button>
            {isOpenButton && <div className={styles.liability}>
              <div>
                <h3>Liability acknowledgment</h3>
                <div className={styles.liabilityTalkDiv}>
                  <p>I understand that there are dangers inherent in participating in the cleanup of our roadways including, but not limited to, bodily injury, disability and death. I understand that participating in this activity may involve risks that include inclement weather or excessive heat, falling debris, proximity to damaged trees or structures, accidents while traveling, injuries from the use of power tools and machinery, equipment problems or failures, proximity to vehicles or equipment (including those producing debris or dust), contact with and actions of other participants, slips/trips/falls, musculoskeletal injuries, harm from contact with sharp objects or tools, contact with chemicals or irritants, exposure to wildlife (including snakes and biting insects), among others. I choose for myself or for my child to participate in this activity despite the risks.

                    I acknowledge all risks of injury, illness and death and affirm that I have assumed all responsibility of injury, illness, or death in any way connected with participation in this activity. I also agree for myself and for any child participant to follow all rules and procedures that apply to the activity and to follow the reasonable instructions of County staff or other supervisors of the activity.

                    In return for the opportunity described above, I agree for myself and for my heirs, assigns, executors and administrators to release, waive and discharge any legal rights I may have to seek payment or relief of any kind from Pittsburgh, its employees or its agents for injury, illness, or death resulting from the activity. If I am allowing a child to participate in the activity, I agree that I am a parent, legal guardian, or am otherwise responsible for the child who is participating, and I agree that I will personally supervise the child during the activity. I also agree not to sue Pittsburgh, its employees, or its agents and agree to indemnify Pittsburgh for all claims, damages, losses, or expenses, including attorney’s fees, if a suit is filed concerning an injury, illness or death to me or to my child resulting from participation in this activity.

                    I understand that neither Pittsburgh nor any Pittsburgh municipality provide insurance or worker’s compensation coverage for me or for my child. I have read this document thoroughly and understand that by checking the box I am waiving legal rights.</p>
                </div>

                <label>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => setIsChecked(!isChecked)}
                  />
                  I agree to the terms
                </label>

                <br />

                <button disabled={!isChecked} onClick={handleClickLiability}>
                  Submit
                </button>
              </div>



            </div>}
          </div>
        </div>
      </div>

      <div className={styles.info}>
        <div>
          <h3>HOW TO:</h3>
          <p>
            Help us clean up South Oakland. Start by clicking a street that you would like to clean. Reserve a date and time for your group to get to work on a street. The key shows what streets are messiest and a danger indicator will show if the street has dangerous conditions. Users must fill out the waiver before cleaning.  
          </p>
        </div>
      </div>








      <div className={styles.imageDiv}>
        <h3>Helpful Resources:</h3>
        <a href="https://www.opdc.org/neighborhoodquality" className={styles.image} target="_blank" rel="noopener noreferrer">
          <img src={require('./OPDC.png')} />
        </a>
      </div>



    </div >
  );
}

//
export default App;

//<div ref={mapRef} style={{ height: 100%, width: 100% }}></div>
//<p>{JSON.stringify(features[0])}</p>
//<pre>{JSON.stringify(features, null, 3)}</pre>

//<arcgis-map className={styles.a} item-id="886277767c274dbfb92b1cb5e2407510" theme="light" zoom="14" portal-url="https://pitt.maps.arcgis.com" ></arcgis-map>

/*




*/
//https://developers.arcgis.com/javascript/latest/tutorials/edit-feature-data/
