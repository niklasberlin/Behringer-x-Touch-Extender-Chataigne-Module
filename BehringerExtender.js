    //Initialize Script variables
    var rate = 30;//Update rate in Hz or FPS
    script.setUpdateRate(rate);
    var yearSecs = 31556926;//Number of seconds in a year (365.24 days)
    var monthSecs = 2629743;//Number of seconds in a (rounded) month
    var daySecs = 86400;//Number of seconds in a day
    var hourSecs = 3600;//Number of seconds in an hour
    var minuteSecs = 60;//Number of seconds in a minute
    var UTCStamp = 0;//Holds UTC TimeUTCStamp for date calculation
    var UTCOffset = 0;//Holds UTC Time UTCOffset for local synchronization
    var frameTicker = 0;//Used to count frames for clip reset
    var deviceTicker = 0;//Used to init device with delay
    var counter = 0;//Used for loop iteration
    var stripArray = [];//Used to construct SysEx commands for scribble strip updates
    var encoderArray = [];//Used to construct SysEx commands for scribble strip updates
    var olddevice;
    var assignArray = [];
        assignArray[0] = "track";
        assignArray[1] = "send";
        assignArray[2] = "pan";
        assignArray[3] = "plugin";
        assignArray[4] = "eq";
        assignArray[5] = "instrument";
    var viewsArray = [];
        viewsArray[0] = "midiTracks";
        viewsArray[1] = "inputs";
        viewsArray[2] = "audioTracks";
        viewsArray[3] = "audioInst";
        viewsArray[4] = "aux";
        viewsArray[5] = "buses";
        viewsArray[6] = "outputs";
        viewsArray[7] = "user";

function init()
{
    script.log("Script Init");

    //Synchronize Arrays 1-7
    for(counter=0;counter<8;counter++){
        //Init Motor Fader Positions
        local.sendPitchWheel(counter+1,local.values.strips.getChild('Strip '+(counter+1)).faderValue.get()*16383);
        //Pulse VU Meters at current value
        local.sendChannelPressure(counter+1,local.values.strips.getChild('Strip '+(counter+1)).meter.get()*14+(16*(counter)));
        //Init POT LEDs
        if(((local.values.strips.getChild('Strip '+(counter+1)).rotaryMode.get()-1)/16==3)||((local.values.strips.getChild('Strip '+(counter+1)).rotaryMode.get()-1)/16==7)){     
            local.sendCC(0,0x30+index,(local.values.strips.getChild('Strip '+(counter+1)).rotaryValue.get()*5)+(local.values.strips.getChild('Strip '+(counter+1)).rotaryMode.get()));
        }else{
            local.sendCC(0,0x30+counter,(local.values.strips.getChild('Strip '+(counter+1)).rotaryValue.get()*11)+(local.values.strips.getChild('Strip '+(counter+1)).rotaryMode.get()));
        }
        //Init Mute
        local.sendNoteOn(1,counter+16,local.values.strips.getChild('Strip '+(counter+1)).mute.get());
        //Init Solo
        local.sendNoteOn(1,counter+8,local.values.strips.getChild('Strip '+(counter+1)).solo.get());
        //Init Rec
        local.sendNoteOn(1,counter+0,local.values.strips.getChild('Strip '+(counter+1)).rec.get());
        //Init Select
        local.sendNoteOn(1,counter+24,local.values.strips.getChild('Strip '+(counter+1)).select.get());
    }

    updateScribble();

    //Send Assembled String Array to scribble strips
    //local.sendSysex(0x00,0x00,0x66,0x14,0x12,0x00,stripArray);

    ////Calculate Clock Values
    //UTCOffset = (yearSecs*1970) + (hourSecs*-2)+(minuteSecs*5) - 22;
    //UTCStamp = util.getTimestamp();
    //script.log(util.getTimestamp());
    //hours = Math.round(Math.floor((((UTCStamp+UTCOffset)%yearSecs)%daySecs)/hourSecs));
    ////Output Hours Digits
    //local.sendCC(1, 71, 48+Math.floor(Math.floor(hours%10)));
    //local.sendCC(1, 72, 48+Math.floor(Math.floor(hours/10)));
    //minutes = Math.round(Math.floor((((UTCStamp+UTCOffset)%yearSecs)%daySecs)%hourSecs/minuteSecs));
    ////Output Minutes Digits
    //local.sendCC(1, 69, 48+Math.floor(Math.floor(minutes%10)));
    //local.sendCC(1, 70, 48+Math.floor(Math.floor(minutes/10)));
    //seconds = Math.round(Math.floor(((((UTCStamp+UTCOffset)%yearSecs)%daySecs)%hourSecs)%minuteSecs));
    ////Output Seconds Digits
    //local.sendCC(1, 67, 48+Math.floor(Math.floor(seconds%10)));
    //local.sendCC(1, 68, 48+Math.floor(Math.floor(seconds/10)));

    //remove tempo and mtc container because the behringer extender does not support those
    local.values.removeContainer("tempo");
    local.values.removeContainer("mtc");
}


//lets update the Text on the LCD: WORKS ONLY IN CTRL MODE
//stripIndex: Integer, number of Strip 1..8
//Text: String, Displayed Text, only 14 hars will be displayed, linebreak after 7 Chars
//color: String, one of the following: "black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"
//invrt: Boolean, true if Text should be displayed inverted 
//function updateScribble(stripIndex, Text, color , invert)
//{
//    script.log("Updating LCD Text for Strip "+stripIndex);
//    var cc = 0;
//    if (color === "black") {
//        cc += 0;
//    } else if (color === "red") {
//        cc += 1;
//    } else if (color === "green") {
//        cc += 2;
//    } else if (color === "yellow") {
//        cc += 3;
//    } else if (color === "blue") {
//        cc += 4;
//    } else if (color === "magenta") {
//        cc += 5;
//    } else if (color === "cyan") {
//        cc += 6;
//    } else if (color === "white") {
//        cc += 7;
//    }
//    if (invert)
//    {
//        cc += 16; //invert upper half of LCD
//        cc += 32; //invert lower half of LCD
//    }
//    if ((Text.length)>14){
//        Text=Text.substring(0,14);
//    }else{
//        while((Text.length)<14){
//            Text+=" ";
//        }
//    }
//
//    local.sendSysex(0xF0,0x00,0x20,0x32,0x15,0x4C, stripIndex-1, cc, Text,0xF7);
//}

function fixedLengthString(stringInput, lengthInput)
{
    //returns a string of a fixed length, to long strings will be shortend, to short strings will be filled with additional whitespace
    tmp =""+stringInput; //make sure we have a string object
    if ((tmp.length)>lengthInput){
        tmp=tmp.substring(0,lengthInput);
    }else{
        while(tmp.length<lengthInput){
            tmp+=" ";
        }
    }
    return tmp;
}

function updateStripArray()
{
    for(counter=0;counter<8;counter++)
    {
        stripArray[counter]=fixedLengthString(local.values.strips.getChild('Strip '+(counter+1)).faderName.get(),14);
        encoderArray[counter]=fixedLengthString(local.values.strips.getChild('Strip '+(counter+1)).encoderName.get(),14);
        //if ((stripArray[counter].length)>14){
        //    stripArray[counter]=stripArray[counter].substring(0,14);
        //}else{
        //    while((stripArray[counter].length)<14){
        //        stripArray[counter]+=" ";
        //    }
        //}
        //if ((encoderArray[counter].length)>14){
        //    encoderArray[counter]=encoderArray[counter].substring(0,14);
        //}else{
        //    while((encoderArray[counter].length)<14){
        //        encoderArray[counter]+=" ";
        //    }
        //}
    }
}


//update scribbles in MC Mode
function updateScribble()
{
    script.log("Scribbles Updated!");
    updateStripArray();
    //send first row:
    firstrow = "";
    secondrow = "";
    for(counter=0;counter<8;counter++)
    {
        if(stripArray[counter].length!=14){
            script.log("Error: StripText legth does not match Display resolution!");
            return;
        }
        if(encoderArray[counter].length!=14){
            script.log("Error: EncoderText legth does not match Display resolution!");
            return;
        }

        if(local.values.strips.getChild('Strip '+(counter+1)).displayMode.get()==0){
            //EFaderName
            firstrow+=stripArray[counter].substring(0,7);
            secondrow+=stripArray[counter].substring(7,14);
        }else if (local.values.strips.getChild('Strip '+(counter+1)).displayMode.get()==1){
            //EncoderName
            firstrow+=encoderArray[counter].substring(0,7);
            secondrow+=encoderArray[counter].substring(7,14);
        }else if(local.values.strips.getChild('Strip '+(counter+1)).displayMode.get()==2){
            //Split
            firstrow+=encoderArray[counter].substring(0,7);
            secondrow+=stripArray[counter].substring(0,7);
        }else if(local.values.strips.getChild('Strip '+(counter+1)).displayMode.get()==3){
            //FaderName + Value
            firstrow+=stripArray[counter].substring(0,7);
            tmp = " "+local.values.strips.getChild('Strip '+(counter+1)).faderValue.get();
            secondrow+=fixedLengthString(tmp.substring(0,5),7);
        }else if(local.values.strips.getChild('Strip '+(counter+1)).displayMode.get()==4){
            //EncoderName + Value
            firstrow+=encoderArray[counter].substring(0,7);
            tmp = " "+local.values.strips.getChild('Strip '+(counter+1)).rotaryValue.get();
            secondrow+=fixedLengthString(tmp.substring(0,5),7);
        }
    }           
    local.sendSysex(0x00, 0x00, 0x66, 0x15, 0x12, 0x00, firstrow);
    local.sendSysex(0x00, 0x00, 0x66, 0x15, 0x12, 0x38, secondrow);
}

function updateScribleColor()
{
    colorArray = [0,0,0,0,0,0,0,0];
    for(counter=0;counter<8;counter++)
    {
        colorArray[counter] += parseInt(local.values.strips.getChild('Strip '+(counter+1)).displayColor.get());
    }
    local.sendSysex(0x00, 0x00, 0x66, 0x15, 0x72, colorArray);
}

function update(deltaTime)
{

    //Get current UTC timestamp
    UTCStamp = util.getTimestamp();
    //Unused calculations for years and days based on UTC stamp
    //var years = Math.round(Math.floor((UTCStamp+UTCOffset)/yearSecs));
    //var days = Math.round(Math.floor(((UTCStamp+UTCOffset)%yearSecs)/daySecs));

    //Is calculated 'hours' value different from the displayed one?
    if(hours!=Math.floor(Math.floor((((UTCStamp+UTCOffset)%yearSecs)%daySecs)/hourSecs))){
        hours = Math.floor(Math.floor((((UTCStamp+UTCOffset)%yearSecs)%daySecs)/hourSecs));
        local.sendCC(1, 71, 48+Math.floor(Math.floor(hours%10)));
        local.sendCC(1, 72, 48+Math.floor(Math.floor(hours/10)));
    }
    //Is calculated 'minutes' value different form the displayed one?
    if(minutes!=Math.round(Math.floor(((((UTCStamp+UTCOffset)%yearSecs)%daySecs)%hourSecs)/minuteSecs))){
        minutes = Math.round(Math.floor((((UTCStamp+UTCOffset)%yearSecs)%daySecs)%hourSecs/minuteSecs));
        local.sendCC(1, 69, 48+Math.round(Math.floor(minutes%10)));
        local.sendCC(1, 70, 48+Math.round(Math.floor(minutes/10)));
    }
    //Is calculated 'seconds' value different from the displayed one?
    if(seconds!=Math.round(Math.floor(((((UTCStamp+UTCOffset)%yearSecs)%daySecs)%hourSecs)%minuteSecs))){
        
        seconds = Math.round(Math.floor(((((UTCStamp+UTCOffset)%yearSecs)%daySecs)%hourSecs)%minuteSecs));
        local.sendCC(1, 67, 48+Math.round(Math.floor(seconds%10)));
        local.sendCC(1, 68, 48+Math.round(Math.floor(seconds/10)));
    }

    

    // Check device change
    if(olddevice != local.parameters.devices.get()){
        deviceTicker++;
        if (deviceTicker==20){
            init();
            olddevice = local.parameters.devices.get();
            deviceTicker = 0;
        }
    }

    //Advance our frame counter
    frameTicker++;
    
    //Clear VU Meter Clip LED
    if (frameTicker>rate*1.5){
        frameTicker = 0;
        var i;
        for(i=0;i<8;i++){
            local.sendChannelPressure(1,15+(16*i));
        }
    }
}

//****MODULE SPECIFIC SCRIPTS********** */

function moduleParameterChanged(param)
{
    if(param.isParameter())
    {
        
        // Did we change the 'FlashOnSolo' mode ?
        if(param.name=="flashOnSolo"){
            var i;
            for(i=0;i<8;i++){
                if(local.values.strips.getChild('Strip '+(i+1)).solo.get()==1){local.values.strips.getChild('Strip '+(i+1)).solo.set("on");
                }else{
                if(local.values.strips.getChild('Strip '+(i+1)).solo.get()==127){local.values.strips.getChild('Strip '+(i+1)).solo.set("flash");}
                }
            }
        }

        //Did we change the selected strip ?
        if(param.name=="stripIndex"){
            var i;
            for(i=0;i<8;i++){
                if((param.get()==0)||(i+1!=param.get())){
                    //select[i].set("Off");
                    local.values.strips.getChild('Strip '+(i+1)).select.set("off");
                }else{
                    // select[i].set("Solid");
                    local.values.strips.getChild('Strip '+(i+1)).select.set("on");
                }
            }
        }

        //Did we change the encoders assign ?
        if(param.name=="encodersAssign"){
            var i;
            for(i=0;i<6;i++){
                if(param.get()!=i){
                    local.values.encoder_Assign.getChild(assignArray[i]).set(0);
                    local.sendNoteOn(1,i+40,0);
                }
                if(param.get()==i){
                    local.values.encoder_Assign.getChild(assignArray[i]).set(1);
                    local.sendNoteOn(1,i+40,127);
                }
            }
        }
    }
}


function moduleValueChanged(value)
{
    //script.log(value.name);
    if(value.isParameter())
    {
        if(value.name=="faderValue"){
            local.sendPitchWheel(parseInt(value.getParent().name.substring(5,6)),value.get()*16383);
        }else{
            if(value.name=="meter"){
                local.sendChannelPressure(1,(value.get()*14)+((parseInt(value.getParent().name.substring(5,6))-1)*16));
            }else{
                if(value.name=="select"){
                    local.sendNoteOn(1,parseInt(value.getParent().name.substring(5,6))+23,value.get());
                }else{
                    if(value.name=="rotaryValue"||value.name=="rotaryMode"){
                        index = parseInt(value.getParent().name.substring(5,6))-1;
                        if(((local.values.strips.getChild('Strip '+(index+1)).rotaryMode.get()-1)/16==3)||((local.values.strips.getChild('Strip '+(index+1)).rotaryMode.get()-1)/16==7)){
                            
                            local.sendCC(0,0x30+index,(local.values.strips.getChild('Strip '+(index+1)).rotaryValue.get()*5)+(local.values.strips.getChild('Strip '+(index+1)).rotaryMode.get()));
                        }else{
                            local.sendCC(0,0x30+index,(local.values.strips.getChild('Strip '+(index+1)).rotaryValue.get()*11)+(local.values.strips.getChild('Strip '+(index+1)).rotaryMode.get()));
                        }
                    }else{
                        if(value.name=="encoderName"){
                            // Update display with new encoder name
                            //var index = parseInt(value.getParent().name.substring(1,2))-1;
                            //var newLabel = value.get();
                            //var short = 7-newLabel.length;
                            //var i;
                            //for (i=0;i<short;i++){
                            //    newLabel = newLabel+" ";
                            //}
                            //if(short>0){
                            //    local.sendSysex(0x00,0x00,0x66,0x14,0x12,((index)*7),newLabel);
                            //}else{
                            //    local.sendSysex(0x00,0x00,0x66,0x14,0x12,((index)*7),newLabel.substring(0,7));
                            //}
                            init();
                        }else{
                            if(value.name=="faderName"){
                                //var index = parseInt(value.getParent().name.substring(1,2))-1;
                                //var newLabel = value.get();
                                //var short = 7-newLabel.length;
                                //var i;
                                //for (i=0;i<short;i++){
                                //    newLabel = newLabel+" ";
                                //}
                                //if(short>0){
                                //    local.sendSysex(0x00,0x00,0x66,0x14,0x12,((index)*7+56),newLabel);
                                //}else{
                                //    local.sendSysex(0x00,0x00,0x66,0x14,0x12,((index)*7)+56,newLabel.substring(0,7));
                                //}
                                updateScribble();
                                init();
                            }else{
                                if(value.name=="solo"){
                                    local.sendNoteOn(1,parseInt(value.getParent().name.substring(5,6))+7,value.get());
                                }else{
                                    if(value.name=="mute"){
                                        local.sendNoteOn(1,parseInt(value.getParent().name.substring(5,6))+15,value.get());
                                    }else{
                                        if(value.name=="rec"){
                                            local.sendNoteOn(1,parseInt(value.getParent().name.substring(5,6))-1,value.get());
                                        }else{
                                            if(value.name=="displayColor"){
                                                updateScribleColor();
                                            }else{
                                                if(value.name=="displayMode"){
                                                    updateScribble();
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}


//*****MIDI MODULE SPECIFIC SCRIPTS*****

function noteOnEvent(channel, pitch, velocity)
{
    // Is it a 'Rec' button ?
    if (pitch >= 0 && pitch <= 7){
        var index = pitch;
        if (local.values.strips.getChild('Strip '+(index+1)).rec.get()==0){
            local.values.strips.getChild('Strip '+(index+1)).rec.set("on");
        }else{
            local.values.strips.getChild('Strip '+(index+1)).rec.set("off");
        }
    }

    //Is it a 'Solo' button ?
    if (pitch >= 8 && pitch <= 15){
        //Change solo strip state
        var index = pitch-8;
        if (local.values.strips.getChild('Strip '+(index+1)).solo.get()==0){
            if (local.parameters.flashOnSolo.get()){local.values.strips.getChild('Strip '+(index+1)).solo.set("flash");}
            else {local.values.strips.getChild('Strip '+(index+1)).solo.set("on");}
        }else{
            local.values.strips.getChild('Strip '+(index+1)).solo.set("off");
        }
    }

    //Is it a 'Mute' button ?
    if (pitch >= 16 && pitch <= 23){
        // Change mute strip state
        var index = pitch-16;
        if (local.values.strips.getChild('Strip '+(index+1)).mute.get()==0){
            local.values.strips.getChild('Strip '+(index+1)).mute.set("on");
        }else{
            local.values.strips.getChild('Strip '+(index+1)).mute.set("off");
        }
    }

    //Is it a 'Select' button?
    if (pitch >= 24 && pitch <= 31){
        //Set new selected strip value    
        local.parameters.stripIndex.set(pitch-23);
    }
    
    //Is it a 'Push' button?
    if (pitch >= 32 && pitch <= 39){
        var index = pitch-32;
        if(velocity==127) {local.values.strips.getChild('Strip '+(index+1)).push.set(1);}
    }

    //Is it a fader touch?
    if (pitch >= 104 && pitch <= 111){
        var index = pitch-104;
        local.values.strips.getChild('Strip '+(index+1)).touch.set(true);
        if (local.parameters.flashOnTouched.get()){
            local.values.strips.getChild('Strip '+(index+1)).select.set("flash");
        }
    }

}

function noteOffEvent(channel, pitch, velocity)
{
    //Is it a fader touch release?
    if (pitch >= 104 && pitch <= 111){
        var index = pitch-104;
        //Release touched boolean
        local.values.strips.getChild('Strip '+(index+1)).touch.set(false);
        //If this strip is selected
        if(local.parameters.stripIndex.get()==index+1){
            //Set light to solid
            local.values.strips.getChild('Strip '+(index+1)).select.set("on");
        }else{
            //Set Light off
            local.values.strips.getChild('Strip '+(index+1)).select.set("off");
        }
    }

    //Is it a 'Push' button?
    if (pitch >= 32 && pitch <= 39){
        var index = pitch-32;
        if(velocity==0) {local.values.strips.getChild('Strip '+(index+1)).push.set(0);}
    }
}

//Upon receiving MIDI Control Change messzge
function ccEvent(channel, number, value)
{   
    //Is it encoder movement?
    if(channel==1 && number >= 16 && number <= 23){
        var index = number-16;
        //If SpinLeft
        if(value>64){
            //Subtract corrected value from rotaryValueue
            local.values.strips.getChild('Strip '+(index+1)).rotaryValue.set(local.values.strips.getChild('Strip '+(index+1)).rotaryValue.get()-((value-64)/256));
        }else{
            //Add value to rotaryValueue
            local.values.strips.getChild('Strip '+(index+1)).rotaryValue.set(local.values.strips.getChild('Strip '+(index+1)).rotaryValue.get()+(value/256));
        }
        updateScribble();
    }
}

//Upon receiving MIDI PitchWheel message (only fader values)
function pitchWheelEvent(channel,value){
    //Is Master fader?
    //script.log("received value");
    //script.log(value);
    if(channel==9){
        local.values.main.mainFader.set(value/16380);
        local.sendPitchWheel(channel,value);
    }
    //It's a strip fader
    else{
        //Update strip module with new value
        local.values.strips.getChild('Strip '+channel).faderValue.set(value/16380);
        updateScribble();
    }
}

//Upon receiving System Exclusive Message
function sysExEvent(data)
{
    //script.log("Sysex Message received, "+data.length+" bytes :");
}


function setBGColor(stripIndex, ColorIndex)
{ //needs to be exposed to the userinterface
    local.values.strips.getChild('Strip '+(stripIndex)).displayColor.set(ColorIndex);
}

function ResetDevice()
{
    for(c=0;c<8;c++)
    {
        //script.log("counter: "+counter);
        //script.log(typeof(local.values.strips.getChild('Strip '+(counter+1)).displayColor));
        //script.log("current Color:" + local.values.strips.getChild('Strip '+(counter+1)).displayColor.getKey());
        local.values.strips.getChild('Strip '+(c+1)).displayColor.setData("0");
        script.log("resetting strip "+(c+1)+"");

        local.values.strips.getChild('Strip '+(c+1)).encoderName.set("");
        local.values.strips.getChild('Strip '+(c+1)).faderName.set("");
        local.values.strips.getChild('Strip '+(c+1)).faderValue.set(0);
        local.values.strips.getChild('Strip '+(c+1)).rotaryValue.set(0);
    }
}

function setRotaryValue(strip, input)
{
    local.values.strips.getChild('Strip '+strip).rotaryValue.set(input);
}

function setFaderValue(strip, input)
{
    local.values.strips.getChild('Strip '+strip).faderValue.set(input);
}