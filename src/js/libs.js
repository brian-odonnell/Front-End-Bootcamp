/*
 Copyright (c) 2013 Hanson Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
 rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of
 the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
 THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
/* global browser, require, define, console */
/**
 * @class HBS
 * @namespace HBS
 * @desc HBS (HanBootStrapper) is a page initialization and object creation/utility library.
 */
(function () {
	var module = {};

	module.defaults = {
		debugMode: true,
		autoInit: false
	};

	/**
	 * @method initPage
	 * @memberof HBS
	 * @desc Initializes a page based on two HTML data attributes, data-section and data-page,
	 * located on the body element. <b>data-section</b> defines a Javascript file to be loaded using
	 * require.js notation (dir/subdir/file). This file is expected to act as a "section controller"
	 * and to load common scripts and initialize common functionality for a group of related pages.
	 * If the loaded JS file contains an init() function, it will be run automatically.
	 * <b>data-page</b> is optional and defines a second, page-level function to run. If data-location
	 * is "com/sections/products", data-action might be "productDetail", in which case HanBootStrapper
	 * will look for a productDetail() function in the loaded JS file and run it.
	 * @param {Boolean} [async=false] If true, loads the script associated with data-async-script
	 * @param {Boolean} [afterAsyncLoad=false] If true, suppresses asynchronous loading to prevent an infinite loop.
	 * Passed by autoLoadScript().
	 */
	module.initPage = function (async, afterAsyncLoad) {
		var body = document.body,
			section = body.getAttribute('data-section'),
			page = body.getAttribute('data-page'),
			asyncScript = body.getAttribute('data-async-script'),
			autoLoadScript = body.getAttribute('data-autoload') != null || async === true;
		var loadedSection = module.getNamespacedObject(section);

		if ( autoLoadScript === true && asyncScript && typeof( loadedSection !== 'function') && afterAsyncLoad !== true) {
			module.autoLoadScript(asyncScript);
			return;
		}

		if (section && loadedSection != null) {
			if (loadedSection.hasOwnProperty('init')) {
				loadedSection.init();
			}

			if (page && typeof(loadedSection[page]) === 'function') {
				loadedSection[page]();
			}

		} else {
			console.log("Unable to load module " + section);
		}
	};

	/**
	 * Attempts to asynchronously load the section controller script and then re-runs
	 * module.initPage().
	 * @internal
	 * @param {String} script A script file to load
	 */
	module.autoLoadScript = function(script) {
		var script = module.getScriptPath(script);

		console.log("Beginning asynchronous load of " + script);
		var s = document.createElement("script");
		s.type = "text/javascript";
		s.onload = function() { module.initPage(false, true); };
		s.onerror = function() { console.log("Unable to load " + script); };
		s.src = script;
		document.head.appendChild(s);
	};

	/**
	 * @method namespace
	 * @memberof HBS
	 * @param {string} pkg: A dot-separated package name for your object, e.g. com.myClass.
	 * Any missing objects from the window object to your class will be created.
	 * @param {function|object} func: A function or object to be namespaced.
	 * @desc Namespaces an object by creating or appending it to the chain of objects
	 * located within a certain package.
	 */
	module.namespace = function (pkg, func) {
		var packageParts = module.getPackageArray(pkg);
		var target = window;
		var nextPart;

		for (var i = 0, max = packageParts.length; i < max; i++) {
			nextPart = packageParts[i];
			target[nextPart] = target[nextPart] || {};
			if (i === max - 1) {
				target[nextPart] = func;
			} else {
				target = target[nextPart];
			}
		}
	};

	/**
	 * @method extend
	 * @memberof HBS
	 * @param {object, function} parent: An object or class to be used as an inheritance
	 * prototype. The child object will be the same type (object or class) as the parent.
	 * @param {function} constructor: An optional function to be the constructor of your
	 * child class. Constructor is ignored if parent is of type {object}.
	 */
	module.extend = function (parent, _constructor) {
		var child;
		var tmp;

		if (typeof(parent) === 'function') {
			var tmp = function () {
			};
			tmp.prototype = parent.prototype;
			child = _constructor;
			if ('create' in Object) {
				child.prototype = Object.create(parent.prototype);
			} else {
				child.prototype = new parent(Array.prototype.slice.call, arguments);
			}

			child.prototype._super = parent.prototype;
			return child;
		}

		else if (typeof(parent) === 'object') {
			child = {};
			child.prototype = parent;
			return child;
		}
	};

	/**
	 * @memberof HBS
	 * @param {string} pkg An object in dot notation (e.g. mySite.myObject)
	 * @returns {Boolean} Whether or not the current object is defined
	 */
	module.exists = function(pkg) {
		return module.getNamespacedObject(pkg) !== null;
	};

	/**
	 * @memberof HBS
	 * @param {string} pkg An object in dot notation (e.g. mySite.myObject)
	 * @returns {Boolean} Returns a namespace object if it exists, or null if it doesn't
	 */
	module.getNamespacedObject = function(pkg) {
		var packageParts = module.getPackageArray(pkg),
			target = window,
			nextPart,
			retVal = null;

		for (var i = 0, max = packageParts.length; i < max; i++) {
			nextPart = packageParts[i];
			if (typeof (target[nextPart]) === 'undefined') {
				retVal = false;
				break;
			}
			retVal = target = target[nextPart];
		}

		return retVal;
	};

	/**
	 * @private
	 * @memberof HBS
	 * @param {Object} pkg: An internal function used to split a string
	 * into an array of objects to be created or traversed.
	 */
	module.getPackageArray = function (pkg) {
		return (typeof(pkg) !== 'string') ? '' : pkg.split('.');
	};

	/**
	 * Returns the path to a given script
	 * @param {String} scriptName
	 * @returns {String} The path of the script to be loaded
	 */
	module.getScriptPath = function(scriptName) {
		if (/^\/\//.test(scriptName)) {
			scriptName = document.location.protocol + scriptName;
		}
		return scriptName;
	}

	if (module.defaults.autoInit) {
		$(document).ready(function() {
			module.initPage();
		});
	}

	module.namespace('HBS', module);
}());




/*
 * ChartNew.js
 * 
 * Vancoppenolle Francois - January 2014
 * francois.vancoppenolle@favomo.be 
 * 
 * Source location : http:\\www.favomo.be\ChartNew
 * GitHub community : https://github.com/FVANCOP/GraphNew.js   
 * 
 * This file is an adaptation of the chart.js source developped by Nick Downie (2013) 
 * https://github.com/nnnick/Chart.js 
 *    
 * new charts
 *  
 *     horizontalBar 
 *     horizontalStackedBar 
 *     
 * Added items : 
 *  
 *     Title
 *     Subtitle
 *     X Axis Label
 *     Y Axis Label
 *     Unit Label                                                                                       
 *     Y Axis on the right and/or the left
 *     Annotates
 *     canvas Border
 *     Legend
 *     Footnote
 *     crossText
 *     graphMin / graphMax
 *     logarithmic y-axis (for line and bar) 
 *     rotateLabels
 *     
 */


     var charJSPersonnalDefaultOptions = { }
         
     var charJSPersonnalDefaultOptionsLine = { }
     var charJSPersonnalDefaultOptionsRadar = { }
     var charJSPersonnalDefaultOptionsPolarArea = { }
     var charJSPersonnalDefaultOptionsPie = { }
     var charJSPersonnalDefaultOptionsDoughnut = { }
     var charJSPersonnalDefaultOptionsBar = { }
     var charJSPersonnalDefaultOptionsStackedBar = { }
     var charJSPersonnalDefaultOptionsHorizontalBar = { }
     var charJSPersonnalDefaultOptionsHorizontalStackedBar = { }



///////// FUNCTIONS THAN CAN BE USED IN THE TEMPLATES ///////////////////////////////////////////




function roundToWithThousands(config, num, place) {
    var newval=1*unFormat(config, num);

    if(typeof(newval)=="number" && place !="none"){
      if(place<=0){
        var roundVal=-place;
        newval= +(Math.round(newval + "e+" + roundVal) + "e-" + roundVal);
      }
      else {
        var roundVal=place;
        var divval= "1e+"+roundVal;
        value= +(Math.round(newval/divval))*divval;
      }
    }
    newval= fmtChartJS(config,newval,"none");
    return(newval);
} ;

function unFormat(config, num) {

    if((config.decimalSeparator!="." || config.thousandSeparator !="") && typeof(num)=="string") {
      var v1=""+num;
      if(config.thousandSeparator!=""){
        while(v1.indexOf(config.thousandSeparator)>=0)v1=""+v1.replace(config.thousandSeparator,"");
      }
      if(config.decimalSeparator!=".")v1=""+v1.replace(config.decimalSeparator,".")
//      v1=fmtChartJS(config,1*roundToWithThousands(1*v1,place),"none")                                                 
      return 1*v1;
    }
    else {
      return num;
    }
};



///////// ANNOTATE PART OF THE SCRIPT ///////////////////////////////////////////

/********************************************************************************
Copyright (C) 1999 Thomas Brattli
This script is made by and copyrighted to Thomas Brattli
Visit for more great scripts. This may be used freely as long as this msg is intact!
I will also appriciate any links you could give me.
Distributed by Hypergurl
********************************************************************************/

var cachebis = {};

function fmtChartJSPerso(config,value,fmt){
  switch(fmt){
    case "SampleJS_Format":
      if(typeof(value)=="number")return_value="My Format : " + value.toString()+ " $";
      else return_value=value + "XX";
      break;
    case "Change_Month":
      if(typeof(value)=="string")return_value=value.toString()+ " 2014";
      else return_value=value.toString()+"YY";
      break;
      
    default: 
      return_value=value;
      break;
    }  
  return(return_value);
};

function fmtChartJS(config,value,fmt){

  var return_value;
  if(fmt=="notformatted") {
    return_value=value;
  }
  else if(fmt=="none" && typeof(value)=="number") {
    if(config.roundNumber !="none"){
      if(config.roundNumber<=0){
        var roundVal=-config.roundNumber;
        value= +(Math.round(value + "e+" + roundVal) + "e-" + roundVal);
      }
      else {
        var roundVal=config.roundNumber;
        var divval= "1e+"+roundVal;
        value= +(Math.round(value/divval))*divval;
      }
    }
    if(config.decimalSeparator!="." || config.thousandSeparator !=""){
      return_value=value.toString().replace(/\./g,config.decimalSeparator);
      if(config.thousandSeparator !=""){
        var part1=return_value;
        var part2="";
        var posdec=part1.indexOf(config.decimalSeparator);
        if(posdec>=0){
          part2=part1.substring(posdec+1,part1.length);
          part2=part2.split('').reverse().join('');  // reverse string
          part1=part1.substring(0,posdec);
        }        
        part1=part1.toString().replace(/\B(?=(\d{3})+(?!\d))/g, config.thousandSeparator);
        // part2=part2.toString().replace(/\B(?=(\d{3})+(?!\d))/g, config.thousandSeparator);
        part2=part2.split('').reverse().join('');   // reverse string
        return_value=part1
        if(part2!="")return_value=return_value+config.decimalSeparator+part2;
      }
    }
    else return_value=value;
  }
  else {
    return_value=fmtChartJSPerso(config,value,fmt);
  }
  return(return_value);
};


function tmplbis(str, data) {
    // Figure out if we're getting a template, or if we need to
    // load the template - and be sure to cache the result.
    var fn = !/\W/.test(str) ?
      cachebis[str] = cachebis[str] ||
        tmplbis(document.getElementById(str).innerHTML) :

      // Generate a reusable function that will serve as a template
      // generator (and which will be cached).
      new Function("obj",
        "var p=[],print=function(){p.push.apply(p,arguments);};" +

        // Introduce the data as local variables using with(){}
        "with(obj){p.push('" +

        // Convert the template into pure JavaScript
        str
          .replace(/[\r\t\n]/g, " ")
          .split("<%").join("\t")
          .replace(/((^|%>)[^\t]*)'/g, "$1\r")
          .replace(/\t=(.*?)%>/g, "',$1,'")
          .split("\t").join("');")
          .split("%>").join("p.push('")
          .split("\r").join("\\'")
      + "');}return p.join('');");

    // Provide some basic currying to the user
    return data ? fn(data) : fn;
};


cursorDivCreated = false;

function createCursorDiv() {
    if (cursorDivCreated == false) {
        var div = document.createElement('divCursor');
        div.id = 'divCursor';
        div.style.position = 'absolute';
        document.body.appendChild(div);
        cursorDivCreated = true;
    }
} ;


//Default browsercheck, added to all scripts!
function checkBrowser() {
    this.ver = navigator.appVersion
    this.dom = document.getElementById ? 1 : 0
    this.ie5 = (this.ver.indexOf("MSIE 5") > -1 && this.dom) ? 1 : 0;
    this.ie4 = (document.all && !this.dom) ? 1 : 0;
    this.ns5 = (this.dom && parseInt(this.ver) >= 5) ? 1 : 0;
    this.ns4 = (document.layers && !this.dom) ? 1 : 0;
    this.bw = (this.ie5 || this.ie4 || this.ns4 || this.ns5)
    return this
};
bw = new checkBrowser();

//Set these variables:
fromLeft = 10; // How much from the left of the cursor should the div be?
fromTop = 10; // How much from the top of the cursor should the div be?

/********************************************************************
Initilizes the objects
*********************************************************************/

function cursorInit() {
    scrolled = bw.ns4 || bw.ns5 ? "window.pageYOffset" : "document.body.scrollTop"
    if (bw.ns4) document.captureEvents(Event.MOUSEMOVE)
} ;
/********************************************************************
Contructs the cursorobjects
*********************************************************************/
function makeCursorObj(obj, nest) {

    createCursorDiv();

    nest = (!nest) ? '' : 'document.' + nest + '.'
    this.css = bw.dom ? document.getElementById(obj).style : bw.ie4 ? document.all[obj].style : bw.ns4 ? eval(nest + "document.layers." + obj) : 0;
    this.moveIt = b_moveIt;

    cursorInit();

    return this
} ;
function b_moveIt(x, y) {


    this.x = x;
    this.y = y;
    this.css.left = this.x + "px";
    this.css.top = this.y + "px";
};




function isIE() {
    var myNav = navigator.userAgent.toLowerCase();
    return (myNav.indexOf('msie') != -1) ? parseInt(myNav.split('msie')[1]) : false;
};

function mergeChartConfig(defaults, userDefined) {
        var returnObj = {};
        for (var attrname in defaults) { returnObj[attrname] = defaults[attrname]; }
        for (var attrname in userDefined) { returnObj[attrname] = userDefined[attrname]; }
        return returnObj;
};

function sleep(ms){
		var dt = new Date();
		dt.setTime(dt.getTime() + ms);
		while (new Date().getTime() < dt.getTime());
} ;

function saveCanvas(ctx,data,config,tpgraph) {
        cvSave = ctx.getImageData(0,0,ctx.canvas.width, ctx.canvas.height);

        var saveCanvasConfig = {
          savePng : false,
          annotateDisplay : false,
          animation : false,
          dynamicDisplay : false
        };
    
        var savePngConfig = mergeChartConfig(config, saveCanvasConfig);

        savePngConfig.clearRect = false;
       
        /* And ink them */

        switch(tpgraph){
          case "Bar":
             new Chart(ctx.canvas.getContext("2d")).Bar(data,savePngConfig);
             break;
          case "Pie":
             new Chart(ctx.canvas.getContext("2d")).Pie(data,savePngConfig);
             break;
          case "Doughnut":
             new Chart(ctx.canvas.getContext("2d")).Doughnut(data,savePngConfig);
             break;
          case "Radar":
             new Chart(ctx.canvas.getContext("2d")).Radar(data,savePngConfig);
             break;
          case "PolarArea":
             new Chart(ctx.canvas.getContext("2d")).PolarArea(data,savePngConfig);
             break;
          case "HorizontalBar":
             new Chart(ctx.canvas.getContext("2d")).HorizontalBar(data,savePngConfig);
             break;
          case "StackedBar":
             new Chart(ctx.canvas.getContext("2d")).StackedBar(data,savePngConfig);
             break;
          case "HorizontalStackedBar":
             new Chart(ctx.canvas.getContext("2d")).HorizontalStackedBar(data,savePngConfig);
             break;
          case "Line":
             new Chart(ctx.canvas.getContext("2d")).Line(data,savePngConfig);
             break;
        }

        document.location.href= ctx.canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        ctx.putImageData(cvSave,0,0); 

} ;


//if (isIE() < 9 && isIE() != false) {

    if (typeof String.prototype.trim !== 'function') {
        String.prototype.trim = function () {
            return this.replace(/^\s+|\s+$/g, '');
        }
    };
//};

var dynamicDisplay = new Array();
var dynamicDisplayList = new Array();

function dynamicFunction(data,config,ctx,tpgraph){
        if(config.dynamicDisplay)
        {
           if(typeof(dynamicDisplay[ctx.canvas.id])=="undefined")
           {
              dynamicDisplayList[dynamicDisplayList["length"]]=ctx.canvas.id;
              dynamicDisplay[ctx.canvas.id]=[ctx.canvas,false,false,data,config,ctx.canvas,tpgraph];
              dynamicDisplay[ctx.canvas.id][1]=isScrolledIntoView(ctx.canvas);
              window.onscroll = scrollFunction;
           }
           if(dynamicDisplay[ctx.canvas.id][1]==false || dynamicDisplay[ctx.canvas.id][2]==true)return false;
           dynamicDisplay[ctx.canvas.id][2]=true;
        }
        return true;
} ;

function isScrolledIntoView(element){
    var xPosition = 0;
    var yPosition = 0;

    elem=element;  
    while(elem) {
        xPosition += (elem.offsetLeft - elem.scrollLeft + elem.clientLeft);
        yPosition += (elem.offsetTop - elem.scrollTop + elem.clientTop);
        elem = elem.offsetParent;
    }
    
    if (xPosition+element.width/2 >= window.pageXOffset &&
        xPosition+element.width/2 <= window.pageXOffset + window.innerWidth &&
        yPosition+element.height/2 >= window.pageYOffset &&
        yPosition+element.height/2 <= window.pageYOffset+window.innerHeight
        )return(true);
    else return false;
};

function scrollFunction(){
    for (var i=0;i<dynamicDisplayList["length"];i++) {
      if (isScrolledIntoView(dynamicDisplay[dynamicDisplayList[i]][5]) && dynamicDisplay[dynamicDisplayList[i]][2]==false) {
        dynamicDisplay[dynamicDisplayList[i]][1]=true;
        switch(dynamicDisplay[dynamicDisplayList[i]][6]){
          case "Bar":
             new Chart(document.getElementById(dynamicDisplayList[i]).getContext("2d")).Bar(dynamicDisplay[dynamicDisplayList[i]][3],dynamicDisplay[dynamicDisplayList[i]][4]);
             break;
          case "Pie":
             new Chart(document.getElementById(dynamicDisplayList[i]).getContext("2d")).Pie(dynamicDisplay[dynamicDisplayList[i]][3],dynamicDisplay[dynamicDisplayList[i]][4]);
             break;
          case "Doughnut":
             new Chart(document.getElementById(dynamicDisplayList[i]).getContext("2d")).Doughnut(dynamicDisplay[dynamicDisplayList[i]][3],dynamicDisplay[dynamicDisplayList[i]][4]);
             break;
          case "Radar":
             new Chart(document.getElementById(dynamicDisplayList[i]).getContext("2d")).Radar(dynamicDisplay[dynamicDisplayList[i]][3],dynamicDisplay[dynamicDisplayList[i]][4]);
             break;
          case "PolarArea":
             new Chart(document.getElementById(dynamicDisplayList[i]).getContext("2d")).PolarArea(dynamicDisplay[dynamicDisplayList[i]][3],dynamicDisplay[dynamicDisplayList[i]][4]);
             break;
          case "HorizontalBar":
             new Chart(document.getElementById(dynamicDisplayList[i]).getContext("2d")).HorizontalBar(dynamicDisplay[dynamicDisplayList[i]][3],dynamicDisplay[dynamicDisplayList[i]][4]);
             break;
          case "StackedBar":
             new Chart(document.getElementById(dynamicDisplayList[i]).getContext("2d")).StackedBar(dynamicDisplay[dynamicDisplayList[i]][3],dynamicDisplay[dynamicDisplayList[i]][4]);
             break;
          case "HorizontalStackedBar":
             new Chart(document.getElementById(dynamicDisplayList[i]).getContext("2d")).HorizontalStackedBar(dynamicDisplay[dynamicDisplayList[i]][3],dynamicDisplay[dynamicDisplayList[i]][4]);
             break;
          case "Line":
             new Chart(document.getElementById(dynamicDisplayList[i]).getContext("2d")).Line(dynamicDisplay[dynamicDisplayList[i]][3],dynamicDisplay[dynamicDisplayList[i]][4]);
             break;
        }
      }
    }
};  
                                                     


var jsGraphAnnotate = new Array();

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
};

function doMouseMove(ctx, config, event) {

    font = "<font face=" + config.annotateFontFamily + " size=" + config.annotateFontSize + "px style=\"font-style:" + config.annotateFontStyle + ";color:" + config.annotateFontColor + "\">";

    var annotateDIV = document.getElementById('divCursor');

    annotateDIV.innerHTML = "";
    annotateDIV.style.border = "";
    annotateDIV.style.backgroundColor = "";

    canvas_pos = getMousePos(ctx.canvas, event);
    for (i = 0; i < jsGraphAnnotate[ctx.canvas.id]["length"]; i++) {

        if (jsGraphAnnotate[ctx.canvas.id][i][0] == "ARC") // Arc 
        {
            distance = Math.sqrt((canvas_pos.x - jsGraphAnnotate[ctx.canvas.id][i][1]) * (canvas_pos.x - jsGraphAnnotate[ctx.canvas.id][i][1]) + (canvas_pos.y - jsGraphAnnotate[ctx.canvas.id][i][2]) * (canvas_pos.y - jsGraphAnnotate[ctx.canvas.id][i][2]));
            if (distance > jsGraphAnnotate[ctx.canvas.id][i][3] && distance < jsGraphAnnotate[ctx.canvas.id][i][4]) {

                angle = Math.acos((canvas_pos.x - jsGraphAnnotate[ctx.canvas.id][i][1]) / distance);
                if (canvas_pos.y < jsGraphAnnotate[ctx.canvas.id][i][2]) angle = -angle;
                
                while (angle < 0){angle+=2*Math.PI;}
                while (angle > 2*Math.PI){angle-=2*Math.PI;}
                if(angle<config.startAngle*(Math.PI/360))angle+=2*Math.PI;

                if ((angle > jsGraphAnnotate[ctx.canvas.id][i][5] && angle < jsGraphAnnotate[ctx.canvas.id][i][6]) || (angle > jsGraphAnnotate[ctx.canvas.id][i][5]-2*Math.PI && angle < jsGraphAnnotate[ctx.canvas.id][i][6]-2*Math.PI)|| (angle > jsGraphAnnotate[ctx.canvas.id][i][5]+2*Math.PI && angle < jsGraphAnnotate[ctx.canvas.id][i][6]+2*Math.PI)) {

                    annotateDIV.style.border = config.annotateBorder;
                    annotateDIV.style.padding = config.annotatePadding;
                    annotateDIV.style.borderRadius = config.annotateBorderRadius;
                    annotateDIV.style.backgroundColor = config.annotateBackgroundColor;

                    v1 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][7],config.fmtV1);       // V1=Label
                    v2 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][8],config.fmtV2);       // V2=Data Value
                    v3 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][9],config.fmtV3);       // V3=Cumulated Value
                    v4 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][10],config.fmtV4);      // V4=Total Data Value
                    v5 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][11],config.fmtV5);      // V5=Angle
    
                    v6 = fmtChartJS(config,100 * jsGraphAnnotate[ctx.canvas.id][i][8] / jsGraphAnnotate[ctx.canvas.id][i][10],config.fmtV6);    // v6=Percentage;
                    v6 = roundToWithThousands(config, v6, config.roundPct);
                    v7 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][1],config.fmtV7);       // v7=midPointX of arc;
                    v8 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][2],config.fmtV8);       // v8=midPointY of arc;
                    v9 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][3],config.fmtV9);       // v9=radius Minimum;
                    v10 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][4],config.fmtV10);      // v10=radius Maximum;
                    v11 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][5],config.fmtV11);      // v11=start angle;
                    v12 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][6],config.fmtV12);      // v12=stop angle;
                    v13 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][12],config.fmtV13);      // v13=position in Data;

                    graphPosX = canvas_pos.x;
                    graphPosY = canvas_pos.y;

                    // create label text
                    dispString = tmplbis(config.annotateLabel, { config:config, v1: v1, v2: v2, v3: v3, v4: v4, v5: v5, v6: v6, v7: v7, v8: v8, v9: v9, v10: v10, v11: v11, v12: v12, v13: v13, graphPosX: graphPosX, graphPosY: graphPosY });
                    annotateDIV.innerHTML = font + dispString + "</font>";


                    x = bw.ns4 || bw.ns5 ? event.pageX : event.x;
                    y = bw.ns4 || bw.ns5 ? event.pageY : event.y;
                    if (bw.ie4 || bw.ie5) y = y + eval(scrolled);
                    oCursor.moveIt(x + fromLeft, y + fromTop);
                }
            }
        } else if (jsGraphAnnotate[ctx.canvas.id][i][0] == "RECT") {
            if (canvas_pos.x > jsGraphAnnotate[ctx.canvas.id][i][1] && canvas_pos.x < jsGraphAnnotate[ctx.canvas.id][i][3] && canvas_pos.y < jsGraphAnnotate[ctx.canvas.id][i][2] && canvas_pos.y > jsGraphAnnotate[ctx.canvas.id][i][4]) {

                annotateDIV.style.border = config.annotateBorder;
                annotateDIV.style.padding = config.annotatePadding;
                annotateDIV.style.borderRadius = config.annotateBorderRadius;
                annotateDIV.style.backgroundColor = config.annotateBackgroundColor;
  
                v1 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][5],config.fmtV1);       // V1=Label1
                v2 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][6],config.fmtV2);       // V2=Label2
                v3 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][7],config.fmtV3);       // V3=Data Value
                v4 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][8],config.fmtV4);       // V4=Cumulated Value
                v5 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][9],config.fmtV5);      // V5=Total Data Value
                v6 = fmtChartJS(config,100 * jsGraphAnnotate[ctx.canvas.id][i][7] / jsGraphAnnotate[ctx.canvas.id][i][9],config.fmtV6);                                  // v6=Percentage;
                v6 = roundToWithThousands(config, v6, config.roundPct);
                v7 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][1],config.fmtV7);       // v7=top X of rectangle;
                v8 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][2],config.fmtV8);       // v8=top Y of rectangle;
                v9 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][3],config.fmtV9);       // v9=bottom X of rectangle;
                v10 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][4],config.fmtV10);      // v10=bottom Y of rectangle;
                v11 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][10],config.fmtV11);      // v11=position in Dataset;
                v12 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][11],config.fmtV12);      // v12=position in Dataset[v11].Data;
                graphPosX = canvas_pos.x;
                graphPosY = canvas_pos.y;

                dispString = tmplbis(config.annotateLabel, { config:config, v1: v1, v2: v2, v3: v3, v4: v4, v5: v5, v6: v6, v7: v7, v8: v8, v9: v9, v10: v10, v11: v11, v12: v12, graphPosX: graphPosX, graphPosY: graphPosY });
                annotateDIV.innerHTML = font + dispString + "</font>";

                x = bw.ns4 || bw.ns5 ? event.pageX : event.x;
                y = bw.ns4 || bw.ns5 ? event.pageY : event.y;
                if (bw.ie4 || bw.ie5) y = y + eval(scrolled);
                oCursor.moveIt(x + fromLeft, y + fromTop);
            }

        } else if (jsGraphAnnotate[ctx.canvas.id][i][0] == "POINT") {
            distance = Math.sqrt((canvas_pos.x - jsGraphAnnotate[ctx.canvas.id][i][1]) * (canvas_pos.x - jsGraphAnnotate[ctx.canvas.id][i][1]) + (canvas_pos.y - jsGraphAnnotate[ctx.canvas.id][i][2]) * (canvas_pos.y - jsGraphAnnotate[ctx.canvas.id][i][2]));
            if (distance < 10) {

                annotateDIV.style.border = config.annotateBorder;
                annotateDIV.style.padding = config.annotatePadding;
                annotateDIV.style.borderRadius = config.annotateBorderRadius;
                annotateDIV.style.backgroundColor = config.annotateBackgroundColor;

                v1 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][3],config.fmtV1);       // V1=Label1
                v2 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][4],config.fmtV2);       // V2=Label2
                v3 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][5],config.fmtV3);       // V3=Data Value
                v4 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][6],config.fmtV4);       // V4=Difference with Previous line
                v5 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][7],config.fmtV5);      // V5=Difference with next line;
                v6 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][8],config.fmtV6);      // V6=max;
                v7 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][9],config.fmtV7);      // V7=Total;
                v8 = fmtChartJS(config,100 * jsGraphAnnotate[ctx.canvas.id][i][5] / jsGraphAnnotate[ctx.canvas.id][i][9],config.fmtV8);                                  // v8=percentage;
                v8 = roundToWithThousands(config, v8, config.roundPct);
                v9 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][1],config.fmtV9);       // v9=pos X of point;
                v10 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][2],config.fmtV10);       // v10=pos Y of point;
                v11 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][10],config.fmtV11);      // v11=position in Dataset;
                v12 = fmtChartJS(config,jsGraphAnnotate[ctx.canvas.id][i][11],config.fmtV12);      // v12=position in Dataset[v11].Data;

                graphPosX = canvas_pos.x;
                graphPosY = canvas_pos.y;

                dispString = tmplbis(config.annotateLabel, { config:config, v1: v1, v2: v2, v3: v3, v4: v4, v5: v5, v6: v6, v7: v7, v8: v8, v9: v9, v10: v10, v11: v11, v12: v12, graphPosX: graphPosX, graphPosY: graphPosY });
                annotateDIV.innerHTML = font + dispString + "</font>";

                x = bw.ns4 || bw.ns5 ? event.pageX : event.x;
                y = bw.ns4 || bw.ns5 ? event.pageY : event.y;
                if (bw.ie4 || bw.ie5) y = y + eval(scrolled);
                oCursor.moveIt(x + fromLeft, y + fromTop);

            }

        }
    }

} ;



///////// GRAPHICAL PART OF THE SCRIPT ///////////////////////////////////////////

 

//Define the global Chart Variable as a class.
window.Chart = function (context) {

    var chart = this;


    //Easing functions adapted from Robert Penner's easing equations
    //http://www.robertpenner.com/easing/

    var animationOptions = {
        linear: function (t) {
            return t;
        },
        easeInQuad: function (t) {
            return t * t;
        },
        easeOutQuad: function (t) {
            return -1 * t * (t - 2);
        },
        easeInOutQuad: function (t) {
            if ((t /= 1 / 2) < 1) return 1 / 2 * t * t;
            return -1 / 2 * ((--t) * (t - 2) - 1);
        },
        easeInCubic: function (t) {
            return t * t * t;
        },
        easeOutCubic: function (t) {
            return 1 * ((t = t / 1 - 1) * t * t + 1);
        },
        easeInOutCubic: function (t) {
            if ((t /= 1 / 2) < 1) return 1 / 2 * t * t * t;
            return 1 / 2 * ((t -= 2) * t * t + 2);
        },
        easeInQuart: function (t) {
            return t * t * t * t;
        },
        easeOutQuart: function (t) {
            return -1 * ((t = t / 1 - 1) * t * t * t - 1);
        },
        easeInOutQuart: function (t) {
            if ((t /= 1 / 2) < 1) return 1 / 2 * t * t * t * t;
            return -1 / 2 * ((t -= 2) * t * t * t - 2);
        },
        easeInQuint: function (t) {
            return 1 * (t /= 1) * t * t * t * t;
        },
        easeOutQuint: function (t) {
            return 1 * ((t = t / 1 - 1) * t * t * t * t + 1);
        },
        easeInOutQuint: function (t) {
            if ((t /= 1 / 2) < 1) return 1 / 2 * t * t * t * t * t;
            return 1 / 2 * ((t -= 2) * t * t * t * t + 2);
        },
        easeInSine: function (t) {
            return -1 * Math.cos(t / 1 * (Math.PI / 2)) + 1;
        },
        easeOutSine: function (t) {
            return 1 * Math.sin(t / 1 * (Math.PI / 2));
        },
        easeInOutSine: function (t) {
            return -1 / 2 * (Math.cos(Math.PI * t / 1) - 1);
        },
        easeInExpo: function (t) {
            return (t == 0) ? 1 : 1 * Math.pow(2, 10 * (t / 1 - 1));
        },
        easeOutExpo: function (t) {
            return (t == 1) ? 1 : 1 * (-Math.pow(2, -10 * t / 1) + 1);
        },
        easeInOutExpo: function (t) {
            if (t == 0) return 0;
            if (t == 1) return 1;
            if ((t /= 1 / 2) < 1) return 1 / 2 * Math.pow(2, 10 * (t - 1));
            return 1 / 2 * (-Math.pow(2, -10 * --t) + 2);
        },
        easeInCirc: function (t) {
            if (t >= 1) return t;
            return -1 * (Math.sqrt(1 - (t /= 1) * t) - 1);
        },
        easeOutCirc: function (t) {
            return 1 * Math.sqrt(1 - (t = t / 1 - 1) * t);
        },
        easeInOutCirc: function (t) {
            if ((t /= 1 / 2) < 1) return -1 / 2 * (Math.sqrt(1 - t * t) - 1);
            return 1 / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1);
        },
        easeInElastic: function (t) {
            var s = 1.70158; var p = 0; var a = 1;
            if (t == 0) return 0; if ((t /= 1) == 1) return 1; if (!p) p = 1 * .3;
            if (a < Math.abs(1)) { a = 1; var s = p / 4; }
            else var s = p / (2 * Math.PI) * Math.asin(1 / a);
            return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * 1 - s) * (2 * Math.PI) / p));
        },
        easeOutElastic: function (t) {
            var s = 1.70158; var p = 0; var a = 1;
            if (t == 0) return 0; if ((t /= 1) == 1) return 1; if (!p) p = 1 * .3;
            if (a < Math.abs(1)) { a = 1; var s = p / 4; }
            else var s = p / (2 * Math.PI) * Math.asin(1 / a);
            return a * Math.pow(2, -10 * t) * Math.sin((t * 1 - s) * (2 * Math.PI) / p) + 1;
        },
        easeInOutElastic: function (t) {
            var s = 1.70158; var p = 0; var a = 1;
            if (t == 0) return 0; if ((t /= 1 / 2) == 2) return 1; if (!p) p = 1 * (.3 * 1.5);
            if (a < Math.abs(1)) { a = 1; var s = p / 4; }
            else var s = p / (2 * Math.PI) * Math.asin(1 / a);
            if (t < 1) return -.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * 1 - s) * (2 * Math.PI) / p));
            return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t * 1 - s) * (2 * Math.PI) / p) * .5 + 1;
        },
        easeInBack: function (t) {
            var s = 1.70158;
            return 1 * (t /= 1) * t * ((s + 1) * t - s);
        },
        easeOutBack: function (t) {
            var s = 1.70158;
            return 1 * ((t = t / 1 - 1) * t * ((s + 1) * t + s) + 1);
        },
        easeInOutBack: function (t) {
            var s = 1.70158;
            if ((t /= 1 / 2) < 1) return 1 / 2 * (t * t * (((s *= (1.525)) + 1) * t - s));
            return 1 / 2 * ((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2);
        },
        easeInBounce: function (t) {
            return 1 - animationOptions.easeOutBounce(1 - t);
        },
        easeOutBounce: function (t) {
            if ((t /= 1) < (1 / 2.75)) {
                return 1 * (7.5625 * t * t);
            } else if (t < (2 / 2.75)) {
                return 1 * (7.5625 * (t -= (1.5 / 2.75)) * t + .75);
            } else if (t < (2.5 / 2.75)) {
                return 1 * (7.5625 * (t -= (2.25 / 2.75)) * t + .9375);
            } else {
                return 1 * (7.5625 * (t -= (2.625 / 2.75)) * t + .984375);
            }
        },
        easeInOutBounce: function (t) {
            if (t < 1 / 2) return animationOptions.easeInBounce(t * 2) * .5;
            return animationOptions.easeOutBounce(t * 2 - 1) * .5 + 1 * .5;
        }
    };

    //Variables global to the chart
    var width = context.canvas.width;
    var height = context.canvas.height;


    //High pixel density displays - multiply the size of the canvas height/width by the device pixel ratio, then scale.
    if (window.devicePixelRatio) {
        context.canvas.style.width = width + "px";
        context.canvas.style.height = height + "px";
        context.canvas.height = height * window.devicePixelRatio;
        context.canvas.width = width * window.devicePixelRatio;
        context.scale(window.devicePixelRatio, window.devicePixelRatio);
    };


    this.PolarArea = function (data, options) {

        chart.PolarArea.defaults = {
			      inGraphDataShow: false,
			      inGraphDataPaddingRadius: 5,
			      inGraphDataPaddingAngle: 0,
            inGraphDataTmpl: "<%=(v1 == ''? '' : v1+':')+ v2 + ' (' + v6 + ' %)'%>",
            inGraphDataAlign : "off-center",   // "right", "center", "left", "off-center" or "to-center"
            inGraphDataVAlign : "off-center",  // "bottom", "center", "top", "off-center" or "to-center"
            inGraphDataRotate : 0,   // rotateAngle value (0->360) , "inRadiusAxis" or "inRadiusAxisRotateLabels"
            inGraphDataFontFamily: "'Arial'",
            inGraphDataFontSize: 12,
            inGraphDataFontStyle: "normal",
            inGraphDataFontColor: "#666",
            inGraphDataRadiusPosition : 3,
            inGraphDataAnglePosition : 2,
            scaleOverlay: true,
            scaleOverride: false,
            scaleSteps: null,
            scaleStepWidth: null,
            scaleStartValue: null,
            scaleShowLine: true,
            scaleLineColor: "rgba(0,0,0,.1)",
            scaleLineWidth: 1,
            scaleShowLabels: true,
            scaleLabel: "<%=value%>",
            scaleFontFamily: "'Arial'",
            scaleFontSize: 12,
            scaleFontStyle: "normal",
            scaleFontColor: "#666",
            scaleShowLabelBackdrop: true,
            scaleBackdropColor: "rgba(255,255,255,0.75)",
            scaleBackdropPaddingY: 2,
            scaleBackdropPaddingX: 2,
            segmentShowStroke: true,
            segmentStrokeColor: "#fff",
            segmentStrokeWidth: 2,
            animation: true,
            animationSteps: 100,
            animationEasing: "easeOutBounce",
            animateRotate: true,
            animateScale: false,
            onAnimationComplete: null,
            annotateLabel: "<%=(v1 == ''? '' : v1+':')+ v2 + ' (' + v6 + ' %)'%>",
            startAngle : 90
        };
        chart.PolarArea.defaults = mergeChartConfig(chart.defaults.commonOptions, chart.PolarArea.defaults);
        chart.PolarArea.defaults = mergeChartConfig(chart.PolarArea.defaults, charJSPersonnalDefaultOptions);
        chart.PolarArea.defaults = mergeChartConfig(chart.PolarArea.defaults, charJSPersonnalDefaultOptionsPolarArea);

        var config = (options) ? mergeChartConfig(chart.PolarArea.defaults, options) : chart.PolarArea.defaults;
        

        return new PolarArea(data, config, context);
    };

    this.Radar = function (data, options) {

        chart.Radar.defaults = {
			      inGraphDataShow: false,
			      inGraphDataPaddingRadius: 5,
            inGraphDataTmpl: "<%=v3%>",
            inGraphDataAlign : "off-center",    // "right", "center", "left", "off-center" or "to-center"
            inGraphDataVAlign : "off-center",   // "right", "center", "left", "off-center" or "to-center"
            inGraphDataRotate : 0,   // rotateAngle value (0->360) , "inRadiusAxis" or "inRadiusAxisRotateLabels"
            inGraphDataFontFamily: "'Arial'",
            inGraphDataFontSize: 12,
            inGraphDataFontStyle: "normal",
            inGraphDataFontColor: "#666",
            inGraphDataRadiusPosition : 3,
            scaleOverlay: false,
            scaleOverride: false,
            scaleSteps: null,
            scaleStepWidth: null,
            scaleStartValue: null,
            scaleShowLine: true,
            scaleLineColor: "rgba(0,0,0,.1)",
            scaleLineWidth: 1,
            scaleShowLabels: false,
            scaleLabel: "<%=value%>",
            scaleFontFamily: "'Arial'",
            scaleFontSize: 12,
            scaleFontStyle: "normal",
            scaleFontColor: "#666",
            scaleShowLabelBackdrop: true,
            scaleBackdropColor: "rgba(255,255,255,0.75)",
            scaleBackdropPaddingY: 2,
            scaleBackdropPaddingX: 2,
            angleShowLineOut: true,
            angleLineColor: "rgba(0,0,0,.1)",
            angleLineWidth: 1,
            pointLabelFontFamily: "'Arial'",
            pointLabelFontStyle: "normal",
            pointLabelFontSize: 12,
            pointLabelFontColor: "#666",
            pointDot: true,
            pointDotRadius: 3,
            pointDotStrokeWidth: 1,
            datasetStroke: true,
            datasetStrokeWidth: 2,
            datasetFill: true,
            animation: true,
            animationSteps: 60,
            animationEasing: "easeOutQuart",
            onAnimationComplete: null,
            annotateLabel: "<%=(v1 == '' ? '' : v1) + (v1!='' && v2 !='' ? '/' : '')+(v2 == '' ? '' : v2)+(v1!='' || v2 !='' ? ':' : '') + v3%>",
            startAngle: 90,
            graphMaximized : false   // if true, the graph will not be centered in the middle of the canvas
        };

        // merge annotate defaults
        chart.Radar.defaults = mergeChartConfig(chart.defaults.commonOptions, chart.Radar.defaults) ;
        chart.Radar.defaults = mergeChartConfig(chart.Radar.defaults, charJSPersonnalDefaultOptions);
        chart.Radar.defaults = mergeChartConfig(chart.Radar.defaults, charJSPersonnalDefaultOptionsRadar);

        var config = (options) ? mergeChartConfig(chart.Radar.defaults, options) : chart.Radar.defaults;

        return new Radar(data, config, context);
    };

    this.Pie = function (data, options) {
        chart.Pie.defaults = {
			      inGraphDataShow: false,
			      inGraphDataPaddingRadius: 5,
			      inGraphDataPaddingAngle: 0,
            inGraphDataTmpl: "<%=(v1 == ''? '' : v1+':')+ v2 + ' (' + v6 + ' %)'%>",
            inGraphDataAlign : "off-center",   // "right", "center", "left", "off-center" or "to-center"
            inGraphDataVAlign : "off-center",  // "bottom", "center", "top", "off-center" or "to-center"
            inGraphDataRotate : 0,   // rotateAngle value (0->360) , "inRadiusAxis" or "inRadiusAxisRotateLabels"
            inGraphDataFontFamily: "'Arial'",
            inGraphDataFontSize: 12,
            inGraphDataFontStyle: "normal",
            inGraphDataFontColor: "#666",
            inGraphDataRadiusPosition : 3,
            inGraphDataAnglePosition : 2,
            graphMaximized : true,
            segmentShowStroke: true,
            segmentStrokeColor: "#fff",
            segmentStrokeWidth: 2,
            animation: true,
            animationSteps: 100,
            animationEasing: "easeOutBounce",
            animateRotate: true,
            animateScale: false,
            onAnimationComplete: null,
            annotateLabel: "<%=(v1 == ''? '' : v1+':')+ v2 + ' (' + v6 + ' %)'%>",
            startAngle: 90,
            radiusScale : 1
        };

        // merge annotate defaults
        chart.Pie.defaults = mergeChartConfig(chart.defaults.commonOptions, chart.Pie.defaults);
        chart.Pie.defaults = mergeChartConfig(chart.Pie.defaults, charJSPersonnalDefaultOptions);
        chart.Pie.defaults = mergeChartConfig(chart.Pie.defaults, charJSPersonnalDefaultOptionsPie);
        var config = (options) ? mergeChartConfig(chart.Pie.defaults, options) : chart.Pie.defaults;

        return new Pie(data, config, context);
    };

    this.Doughnut = function (data, options) {

        chart.Doughnut.defaults = {
			      inGraphDataShow: false,
			      inGraphDataPaddingRadius: 5,
			      inGraphDataPaddingAngle: 0,
            inGraphDataTmpl: "<%=(v1 == ''? '' : v1+':')+ v2 + ' (' + v6 + ' %)'%>",
            inGraphDataAlign : "off-center",   // "right", "center", "left", "off-center" or "to-center"
            inGraphDataVAlign : "off-center",  // "bottom", "center", "top", "off-center" or "to-center"
            inGraphDataRotate : 0,   // rotateAngle value (0->360) , "inRadiusAxis" or "inRadiusAxisRotateLabels"
            inGraphDataFontFamily: "'Arial'",
            inGraphDataFontSize: 12,
            inGraphDataFontStyle: "normal",
            inGraphDataFontColor: "#666",
            inGraphDataRadiusPosition : 3,
            inGraphDataAnglePosition : 2,
            segmentShowStroke: true,
            segmentStrokeColor: "#fff",
            segmentStrokeWidth: 2,
            percentageInnerCutout: 50,
            animation: true,
            animationSteps: 100,
            animationEasing: "easeOutBounce",
            animateRotate: true,
            animateScale: false,
            onAnimationComplete: null,
            annotateLabel: "<%=(v1 == ''? '' : v1+':')+ v2 + ' (' + v6 + ' %)'%>",
            startAngle: 90,
            radiusScale : 1
        };

        // merge annotate defaults
        chart.Doughnut.defaults = mergeChartConfig(chart.defaults.commonOptions, chart.Doughnut.defaults);
        chart.Doughnut.defaults = mergeChartConfig(chart.Doughnut.defaults, charJSPersonnalDefaultOptions);
        chart.Doughnut.defaults = mergeChartConfig(chart.Doughnut.defaults, charJSPersonnalDefaultOptionsDoughnut);
        var config = (options) ? mergeChartConfig(chart.Doughnut.defaults, options) : chart.Doughnut.defaults;

        return new Doughnut(data, config, context);

    };

    this.Line = function (data, options) {

        chart.Line.defaults = {
			      inGraphDataShow: false,
			      inGraphDataPaddingX: 3,
			      inGraphDataPaddingY: 3,
            inGraphDataTmpl: "<%=v3%>",
            inGraphDataAlign : "left",
            inGraphDataVAlign : "bottom",
            inGraphDataRotate : 0,
            inGraphDataFontFamily: "'Arial'",
            inGraphDataFontSize: 12,
            inGraphDataFontStyle: "normal",
            inGraphDataFontColor: "#666",
            scaleOverlay: false,
            scaleOverride: false,
            scaleSteps: null,
            scaleStepWidth: null,
            scaleStartValue: null,
            scaleLineColor: "rgba(0,0,0,.1)",
            scaleLineWidth: 1,
            scaleShowLabels: true,
            scaleLabel: "<%=value%>",
            scaleFontFamily: "'Arial'",
            scaleFontSize: 12,
            scaleFontStyle: "normal",
            scaleFontColor: "#666",
            scaleShowGridLines: true,
            scaleXGridLinesStep : 1,
            scaleYGridLinesStep : 1,
            scaleGridLineColor: "rgba(0,0,0,.05)",
            scaleGridLineWidth: 1,
            showYAxisMin: true,      // Show the minimum value on Y axis (in original version, this minimum is not displayed - it can overlap the X labels)
            rotateLabels: "smart",   // smart <=> 0 degre if space enough; otherwise 45 degres if space enough otherwise90 degre; 
            // you can force an integer value between 0 and 180 degres
            logarithmic: false, // can be 'fuzzy',true and false ('fuzzy' => if the gap between min and maximum is big it's using a logarithmic y-Axis scale
            scaleTickSizeLeft: 5,
            scaleTickSizeRight: 5,
            scaleTickSizeBottom: 5,
            scaleTickSizeTop: 5,
            bezierCurve: true,
            pointDot: true,
            pointDotRadius: 4,
            pointDotStrokeWidth: 2,
            datasetStroke: true,
            datasetStrokeWidth: 2,
            datasetFill: true,
            animation: true,
            animationSteps: 60,
            animationEasing: "easeOutQuart",
            onAnimationComplete: null,
            annotateLabel: "<%=(v1 == '' ? '' : v1) + (v1!='' && v2 !='' ? '/' : '')+(v2 == '' ? '' : v2)+(v1!='' || v2 !='' ? ':' : '') + v3%>"
            
        };

        // merge annotate defaults
        chart.Line.defaults = mergeChartConfig(chart.defaults.commonOptions, chart.Line.defaults);
        chart.Line.defaults = mergeChartConfig(chart.defaults.xyAxisCommonOptions, chart.Line.defaults);
        chart.Line.defaults = mergeChartConfig(chart.Line.defaults, charJSPersonnalDefaultOptions);
        chart.Line.defaults = mergeChartConfig(chart.Line.defaults, charJSPersonnalDefaultOptionsLine);
        
        var config = (options) ? mergeChartConfig(chart.Line.defaults, options) : chart.Line.defaults;

        return new Line(data, config, context);
    };

    this.StackedBar = function (data, options) {

        chart.StackedBar.defaults = {
			      inGraphDataShow: false,
			      inGraphDataPaddingX: 0,
			      inGraphDataPaddingY: -3,
            inGraphDataTmpl: "<%=v3%>",
            inGraphDataAlign : "center",
            inGraphDataVAlign : "top",
            inGraphDataRotate : 0,
            inGraphDataFontFamily: "'Arial'",
            inGraphDataFontSize: 12,
            inGraphDataFontStyle: "normal",
            inGraphDataFontColor: "#666",
            inGraphDataXPosition : 2,
            inGraphDataYPosition : 3,
            scaleOverlay: false,
            scaleOverride: false,
            scaleSteps: null,
            scaleStepWidth: null,
            scaleStartValue: null,
            scaleLineColor: "rgba(0,0,0,.1)",
            scaleLineWidth: 1,
            scaleShowLabels: true,
            scaleLabel: "<%=value%>",
            scaleFontFamily: "'Arial'",
            scaleFontSize: 12,
            scaleFontStyle: "normal",
            scaleFontColor: "#666",
            scaleShowGridLines: true,
            scaleXGridLinesStep : 1,
            scaleYGridLinesStep : 1,
            scaleGridLineColor: "rgba(0,0,0,.05)",
            scaleGridLineWidth: 1,
            showYAxisMin: true,      // Show the minimum value on Y axis (in original version, this minimum is not displayed - it can overlap the X labels)
            rotateLabels: "smart",   // smart <=> 0 degre if space enough; otherwise 45 degres if space enough otherwise90 degre; 
            // you can force an integer value between 0 and 180 degres
            scaleTickSizeLeft: 5,
            scaleTickSizeRight: 5,
            scaleTickSizeBottom: 5,
            scaleTickSizeTop: 5,
            barShowStroke: true,
            barStrokeWidth: 2,
            barValueSpacing: 5,
            barDatasetSpacing: 1,
            animation: true,
            animationSteps: 60,
            animationEasing: "easeOutQuart",
            onAnimationComplete: null,
            annotateLabel: "<%=(v1 == '' ? '' : v1) + (v1!='' && v2 !='' ? '/' : '')+(v2 == '' ? '' : v2)+(v1!='' || v2 !='' ? ':' : '') + v3 + ' (' + v6 + ' %)'%>"
         };   
            

        // merge annotate defaults
        chart.StackedBar.defaults = mergeChartConfig(chart.defaults.commonOptions, chart.StackedBar.defaults);
        chart.StackedBar.defaults = mergeChartConfig(chart.defaults.xyAxisCommonOptions, chart.StackedBar.defaults);
        chart.StackedBar.defaults = mergeChartConfig(chart.StackedBar.defaults, charJSPersonnalDefaultOptions);
        chart.StackedBar.defaults = mergeChartConfig(chart.StackedBar.defaults, charJSPersonnalDefaultOptionsStackedBar);

        var config = (options) ? mergeChartConfig(chart.StackedBar.defaults, options) : chart.StackedBar.defaults;
        return new StackedBar(data, config, context);
    } ;

    this.HorizontalStackedBar = function (data, options) {

        chart.HorizontalStackedBar.defaults = {
			      inGraphDataShow: false,
			      inGraphDataPaddingX: -3,
			      inGraphDataPaddingY: 0,
            inGraphDataTmpl: "<%=v3%>",
            inGraphDataAlign : "right",
            inGraphDataVAlign : "center",
            inGraphDataRotate : 0,
            inGraphDataFontFamily: "'Arial'",
            inGraphDataFontSize: 12,
            inGraphDataFontStyle: "normal",
            inGraphDataFontColor: "#666",
            inGraphDataXPosition : 3,
            inGraphDataYPosition : 2,
            scaleOverlay: false,
            scaleOverride: false,
            scaleSteps: null,
            scaleStepWidth: null,
            scaleStartValue: null,
            scaleLineColor: "rgba(0,0,0,.1)",
            scaleLineWidth: 1,
            scaleShowLabels: true,
            scaleLabel: "<%=value%>",
            scaleFontFamily: "'Arial'",
            scaleFontSize: 12,
            scaleFontStyle: "normal",
            scaleFontColor: "#666",
            scaleShowGridLines: true,
            scaleXGridLinesStep : 1,
            scaleYGridLinesStep : 1,
            scaleGridLineColor: "rgba(0,0,0,.05)",
            scaleGridLineWidth: 1,
            scaleTickSizeLeft: 5,
            scaleTickSizeRight: 5,
            scaleTickSizeBottom: 5,
            scaleTickSizeTop: 5,
            showYAxisMin: true,      // Show the minimum value on Y axis (in original version, this minimum is not displayed - it can overlap the X labels)
            rotateLabels: "smart",   // smart <=> 0 degre if space enough; otherwise 45 degres if space enough otherwise90 degre; 
            barShowStroke: true,
            barStrokeWidth: 2,
            barValueSpacing: 5,
            barDatasetSpacing: 1,
            animation: true,
            animationSteps: 60,
            animationEasing: "easeOutQuart",
            onAnimationComplete: null,
            annotateLabel: "<%=(v1 == '' ? '' : v1) + (v1!='' && v2 !='' ? '/' : '')+(v2 == '' ? '' : v2)+(v1!='' || v2 !='' ? ':' : '') + v3 + ' (' + v6 + ' %)'%>"
         };   
            

        // merge annotate defaults
        chart.HorizontalStackedBar.defaults = mergeChartConfig(chart.defaults.commonOptions, chart.HorizontalStackedBar.defaults);
        chart.HorizontalStackedBar.defaults = mergeChartConfig(chart.defaults.xyAxisCommonOptions, chart.HorizontalStackedBar.defaults);
        chart.HorizontalStackedBar.defaults = mergeChartConfig(chart.HorizontalStackedBar.defaults, charJSPersonnalDefaultOptions);
        chart.HorizontalStackedBar.defaults = mergeChartConfig(chart.HorizontalStackedBar.defaults, charJSPersonnalDefaultOptionsHorizontalStackedBar);
        var config = (options) ? mergeChartConfig(chart.HorizontalStackedBar.defaults, options) : chart.HorizontalStackedBar.defaults;
        return new HorizontalStackedBar(data, config, context);
    } ;

    this.Bar = function (data, options) {
        chart.Bar.defaults = {
			      inGraphDataShow: false,
			      inGraphDataPaddingX: 0,
			      inGraphDataPaddingY: 3,
            inGraphDataTmpl: "<%=v3%>",
            inGraphDataAlign : "center",
            inGraphDataVAlign : "bottom",
            inGraphDataRotate : 0,
            inGraphDataFontFamily: "'Arial'",
            inGraphDataFontSize: 12,
            inGraphDataFontStyle: "normal",
            inGraphDataFontColor: "#666",
            inGraphDataXPosition : 2,
            inGraphDataYPosition : 3,
            scaleOverlay: false,
            scaleOverride: false,
            scaleSteps: null,
            scaleStepWidth: null,
            scaleStartValue: null,
            scaleLineColor: "rgba(0,0,0,.1)",
            scaleLineWidth: 1,
            scaleShowLabels: true,
            scaleLabel: "<%=value%>",
            scaleFontFamily: "'Arial'",
            scaleFontSize: 12,
            scaleFontStyle: "normal",
            scaleFontColor: "#666",
            scaleShowGridLines: true,
            scaleXGridLinesStep : 1,
            scaleYGridLinesStep : 1,
            scaleGridLineColor: "rgba(0,0,0,.05)",
            scaleGridLineWidth: 1,
            showYAxisMin: true,      // Show the minimum value on Y axis (in original version, this minimum is not displayed - it can overlap the X labels)
            rotateLabels: "smart",   // smart <=> 0 degre if space enough; otherwise 45 degres if space enough otherwise90 degre; 
            // you can force an integer value between 0 and 180 degres
            logarithmic: false, // can be 'fuzzy',true and false ('fuzzy' => if the gap between min and maximum is big it's using a logarithmic y-Axis scale
            scaleTickSizeLeft: 5,
            scaleTickSizeRight: 5,
            scaleTickSizeBottom: 5,
            scaleTickSizeTop: 5,
            barShowStroke: true,
            barStrokeWidth: 2,
            barValueSpacing: 5,
            barDatasetSpacing: 1,
            animation: true,
            animationSteps: 60,
            animationEasing: "easeOutQuart",
            onAnimationComplete: null,
            annotateLabel: "<%=(v1 == '' ? '' : v1) + (v1!='' && v2 !='' ? '/' : '')+(v2 == '' ? '' : v2)+(v1!='' || v2 !='' ? ':' : '') + v3 + ' (' + v6 + ' %)'%>"
         };   

        // merge annotate defaults
        chart.Bar.defaults = mergeChartConfig(chart.defaults.commonOptions, chart.Bar.defaults);
        chart.Bar.defaults = mergeChartConfig(chart.defaults.xyAxisCommonOptions, chart.Bar.defaults);
        chart.Bar.defaults = mergeChartConfig(chart.Bar.defaults, charJSPersonnalDefaultOptions);
        chart.Bar.defaults = mergeChartConfig(chart.Bar.defaults, charJSPersonnalDefaultOptionsBar);
        var config = (options) ? mergeChartConfig(chart.Bar.defaults, options) : chart.Bar.defaults;

        return new Bar(data, config, context);
    } ;

    this.HorizontalBar = function (data, options) {
        chart.HorizontalBar.defaults = {
			      inGraphDataShow: false,
			      inGraphDataPaddingX: 3,
			      inGraphDataPaddingY: 0,
            inGraphDataTmpl: "<%=v3%>",
            inGraphDataAlign : "left",
            inGraphDataVAlign : "middle",
            inGraphDataRotate : 0,
            inGraphDataFontFamily: "'Arial'",
            inGraphDataFontSize: 12,
            inGraphDataFontStyle: "normal",
            inGraphDataFontColor: "#666",
            inGraphDataXPosition : 3,
            inGraphDataYPosition : 2,
            scaleOverlay: false,
            scaleOverride: false,
            scaleSteps: null,
            scaleStepWidth: null,
            scaleStartValue: null,
            scaleLineColor: "rgba(0,0,0,.1)",
            scaleLineWidth: 1,
            scaleShowLabels: true,
            scaleLabel: "<%=value%>",
            scaleFontFamily: "'Arial'",
            scaleFontSize: 12,
            scaleFontStyle: "normal",
            scaleFontColor: "#666",
            scaleShowGridLines: true,
            scaleXGridLinesStep : 1,
            scaleYGridLinesStep : 1,
            scaleGridLineColor: "rgba(0,0,0,.05)",
            scaleGridLineWidth: 1,
            scaleTickSizeLeft: 5,
            scaleTickSizeRight: 5,
            scaleTickSizeBottom: 5,
            scaleTickSizeTop: 5,
            showYAxisMin: true,      // Show the minimum value on Y axis (in original version, this minimum is not displayed - it can overlap the X labels)
            rotateLabels: "smart",   // smart <=> 0 degre if space enough; otherwise 45 degres if space enough otherwise90 degre; 
            barShowStroke: true,
            barStrokeWidth: 2,
            barValueSpacing: 5,
            barDatasetSpacing: 1,
            animation: true,
            animationSteps: 60,
            animationEasing: "easeOutQuart",
            onAnimationComplete: null,
            annotateLabel: "<%=(v1 == '' ? '' : v1) + (v1!='' && v2 !='' ? '/' : '')+(v2 == '' ? '' : v2)+(v1!='' || v2 !='' ? ':' : '') + v3 + ' (' + v6 + ' %)'%>"
            
        };

        // merge annotate defaults
        chart.HorizontalBar.defaults = mergeChartConfig(chart.defaults.commonOptions, chart.HorizontalBar.defaults);
        chart.HorizontalBar.defaults = mergeChartConfig(chart.defaults.xyAxisCommonOptions, chart.HorizontalBar.defaults);
        chart.HorizontalBar.defaults = mergeChartConfig(chart.HorizontalBar.defaults, charJSPersonnalDefaultOptions);
        chart.HorizontalBar.defaults = mergeChartConfig(chart.HorizontalBar.defaults, charJSPersonnalDefaultOptionsHorizontalBar);
        var config = (options) ? mergeChartConfig(chart.HorizontalBar.defaults, options) : chart.HorizontalBar.defaults;

        return new HorizontalBar(data, config, context);
    } ;

    chart.defaults = {};
    chart.defaults.commonOptions = {
        clearRect : true,       // do not change clearRect options; for internal use only
        dynamicDisplay : false,
        graphSpaceBefore : 5,
        graphSpaceAfter : 5,
        canvasBorders: false,
        canvasBackgroundColor : "none",
        canvasBordersWidth: 3,
        canvasBordersColor: "black",
        graphTitle: "",
        graphTitleFontFamily: "'Arial'",
        graphTitleFontSize: 24,
        graphTitleFontStyle: "bold",
        graphTitleFontColor: "#666",
        graphTitleSpaceBefore : 5,
        graphTitleSpaceAfter : 5,
        graphSubTitle: "",
        graphSubTitleFontFamily: "'Arial'",
        graphSubTitleFontSize: 18,
        graphSubTitleFontStyle: "normal",
        graphSubTitleFontColor: "#666",
        graphSubTitleSpaceBefore : 5,
        graphSubTitleSpaceAfter : 5,
        footNote: "",
        footNoteFontFamily: "'Arial'",
        footNoteFontSize: 8,
        footNoteFontStyle: "bold",
        footNoteFontColor: "#666",
        footNoteSpaceBefore : 5,
        footNoteSpaceAfter : 5,
        legend: false,
        legendFontFamily: "'Arial'",
        legendFontSize: 12,
        legendFontStyle: "normal",
        legendFontColor: "#666",
        legendBlockSize: 15,
        legendBorders: true,
        legendBordersWidth: 1,
        legendBordersColors: "#666",
        legendBordersSpaceBefore : 5,
        legendBordersSpaceAfter : 5, 
        legendBordersSpaceLeft : 5, 
        legendBordersSpaceRight : 5, 
        legendSpaceBeforeText : 5,
        legendSpaceAfterText : 5,
        legendSpaceLeftText : 5,
        legendSpaceRightText : 5,
        legendSpaceBetweenTextVertical : 5,
        legendSpaceBetweenTextHorizontal : 5,
        legendSpaceBetweenBoxAndText : 5,
        annotateDisplay: false,  
        savePng : false,
        savePngFunction: "mousedown right", 
        savePngBackgroundColor : 'WHITE',
        annotateFunction: "mousemove",
        annotateFontFamily: "'Arial'",
        annotateBorder: 'none', 
        annotateBorderRadius: '2px',
        annotateBackgroundColor: 'rgba(0,0,0,0.8)', 
        annotateFontSize: 4,
        annotateFontColor: 'white',
        annotateFontStyle: "normal",
        annotatePadding: "3px",
        crossText: [""],
        crossTextIter: ["all"],
        crossTextOverlay: [true],
        crossTextFontFamily: ["'Arial'"],
        crossTextFontSize: [12],
        crossTextFontStyle: ["normal"],
        crossTextFontColor: ["rgba(220,220,220,1)"],
        crossTextRelativePosX: [2],
        crossTextRelativePosY: [2],
        crossTextBaseline: ["middle"],
        crossTextAlign: ["center"],
        crossTextPosX: [0],
        crossTextPosY: [0],
        crossTextAngle: [0],
        crossTextFunction: null,
        spaceTop: 0,
        spaceBottom: 0,
        spaceRight: 0,
        spaceLeft: 0,
        decimalSeparator : ".",
        thousandSeparator : "",
        roundNumber : "none",
        roundPct : -1,
        fmtV1 : "none",
        fmtV2 : "none",
        fmtV3 : "none",
        fmtV4 : "none",
        fmtV5 : "none",
        fmtV6 : "none",
        fmtV7 : "none",
        fmtV8 : "none",
        fmtV9 : "none",
        fmtV10 : "none",
        fmtV11 : "none",
        fmtV12 : "none",
        fmtV13 : "none",
        fmtXLabel : "none",
        fmtYLabel : "none",
        fmtLegend : "none"
    };

    chart.defaults.xyAxisCommonOptions = {
            yAxisLeft: true,
            yAxisRight: false,
            xAxisBottom: true,
            xAxisTop: false,
            xAxisSpaceBetweenLabels : 5,
            yAxisLabel: "",
            yAxisFontFamily: "'Arial'",
            yAxisFontSize: 16,
            yAxisFontStyle: "normal",
            yAxisFontColor: "#666",
            yAxisLabelSpaceRight : 5,
            yAxisLabelSpaceLeft : 5,
            yAxisSpaceRight : 5,
            yAxisSpaceLeft : 5,
            xAxisLabel: "",
            xAxisFontFamily: "'Arial'",
            xAxisFontSize: 16,
            xAxisFontStyle: "normal",
            xAxisFontColor: "#666",
            xAxisLabelSpaceBefore : 5,
            xAxisLabelSpaceAfter : 5,
            xAxisSpaceBefore : 5,
            xAxisSpaceAfter : 5,
            yAxisUnit: "",
            yAxisUnitFontFamily: "'Arial'",
            yAxisUnitFontSize: 8,
            yAxisUnitFontStyle: "normal",
            yAxisUnitFontColor: "#666",
            yAxisUnitSpaceBefore : 5,
            yAxisUnitSpaceAfter : 5
    };
 


    var clear = function (c) {
        c.clearRect(0, 0, width, height);
    };

    var PolarArea = function (data, config, ctx) {
        var maxSize, scaleHop, calculatedScale, labelHeight, scaleHeight, valueBounds, labelTemplateString, msr, midPosX, midPosY;

        if (!dynamicFunction(data,config,ctx,"PolarArea"))return;

        var realStartAngle=config.startAngle* (Math.PI / 180)+2*Math.PI;

        while (config.startAngle < 0){config.startAngle+=360;}
        while (config.startAngle > 360){config.startAngle-=360;}

        while (realStartAngle < 0){realStartAngle+=2*Math.PI;}
        while (realStartAngle > 2*Math.PI){realStartAngle-=2*Math.PI;}


        config.logarithmic = false;

        var annotateCnt = 0;
        jsGraphAnnotate[ctx.canvas.id] = new Array();

        defMouse(ctx,data,config,"PolarArea");
        
        setRect(ctx,config);

        valueBounds = getValueBounds();
        //Check and set the scale
        labelTemplateString = (config.scaleShowLabels) ? config.scaleLabel : "";

        if (!config.scaleOverride) {
            calculatedScale = calculateScale(config, valueBounds.maxDailySteps, valueBounds.minSteps, valueBounds.maxValue, valueBounds.minValue, labelTemplateString);
            msr = setMeasures(data, config, ctx, height, width, calculatedScale.labels, true, false, false, false);
        }
        else {
            calculatedScale = {
                steps: config.scaleSteps,
                stepValue: config.scaleStepWidth,
                graphMin: config.scaleStartValue,
                graphMax: config.scaleStartValue+config.scaleSteps*config.scaleStepWidth,
                labels: []
            }
            populateLabels(config, labelTemplateString, calculatedScale.labels, calculatedScale.steps, config.scaleStartValue, calculatedScale.graphMax, config.scaleStepWidth);
            msr = setMeasures(data, config, ctx, height, width, calculatedScale.labels, true, false, false, false);
        }


        midPosX = msr.leftNotUsableSize + (msr.availableWidth / 2);
        midPosY = msr.topNotUsableSize + (msr.availableHeight / 2);


        scaleHop = Math.floor(((Min([msr.availableHeight, msr.availableWidth]) / 2) - 5) / calculatedScale.steps);


        //Wrap in an animation loop wrapper
        animationLoop(config, drawScale, drawAllSegments, ctx, msr.clrx, msr.clry, msr.clrwidth, msr.clrheight, midPosX, midPosY, midPosX - ((Min([msr.availableHeight, msr.availableWidth]) / 2) - 5), midPosY + ((Min([msr.availableHeight, msr.availableWidth]) / 2) - 5), data);


        function drawAllSegments(animationDecimal) {
            var startAngle = -config.startAngle * (Math.PI / 180)+2*Math.PI,
      cumvalue = 0,
			angleStep = 0,
			scaleAnimation = 1,
			rotateAnimation = 1;
      angleStep=0;



      for (var i = 0; i < data.length; i++) if (!(typeof(data[i].value)=='undefined'))angleStep++;
      
      angleStep= (Math.PI * 2) / angleStep;
 
            while (startAngle < 0){startAngle+=2*Math.PI;}
            while (startAngle > 2*Math.PI){startAngle-=2*Math.PI;}


            if (config.animation) {
                if (config.animateScale) {
                    scaleAnimation = animationDecimal;
                }
                if (config.animateRotate) {
                    rotateAnimation = animationDecimal;
                }
            }
            if (animationDecimal >= 1) {
                totvalue = 0;
                for (var i = 0; i < data.length; i++) if (!(typeof(data[i].value)=='undefined'))totvalue += 1*data[i].value;
            }

            for (var i = 0; i < data.length; i++) {
              if (!(typeof(data[i].value)=='undefined')){
                ctx.beginPath();
                ctx.arc(midPosX, midPosY, scaleAnimation * calculateOffset(config, 1*data[i].value, calculatedScale, scaleHop), startAngle, startAngle + rotateAnimation * angleStep, false);
                ctx.lineTo(midPosX, midPosY);
                ctx.closePath();
                ctx.fillStyle = data[i].color;
                ctx.fill();

                startAngle += angleStep;

                if (config.segmentShowStroke) {
                    ctx.strokeStyle = config.segmentStrokeColor;
                    ctx.lineWidth = config.segmentStrokeWidth;
                    ctx.stroke();
                }
              }

            }
            if (animationDecimal >= 1) {
              startAngle = -config.startAngle * (Math.PI / 180)+2*Math.PI;
              for (var i = 0; i < data.length; i++) {
                if (!(typeof(data[i].value)=='undefined')){
                    cumvalue += 1*data[i].value;
                    startAngle += angleStep;
 
                    if (typeof (data[i].title) == "string") lgtxt = data[i].title.trim();
                    else lgtxt = "";
                    jsGraphAnnotate[ctx.canvas.id][annotateCnt++] = ["ARC", midPosX, midPosY, 0, calculateOffset(config, 1*data[i].value, calculatedScale, scaleHop), startAngle - angleStep, startAngle, lgtxt, 1*data[i].value, cumvalue, totvalue, angleStep, i];

                    if (config.inGraphDataShow) {
                    
                         if(config.inGraphDataAnglePosition==1)posAngle=realStartAngle+config.inGraphDataPaddingAngle*(Math.PI/180);
                         else if(config.inGraphDataAnglePosition==2)posAngle=realStartAngle-angleStep/2+config.inGraphDataPaddingAngle*(Math.PI/180);
                         else if(config.inGraphDataAnglePosition==3)posAngle=realStartAngle-angleStep+config.inGraphDataPaddingAngle*(Math.PI/180);

                         if(config.inGraphDataRadiusPosition==1)labelRadius=0+config.inGraphDataPaddingRadius;
                         else if(config.inGraphDataRadiusPosition==2)labelRadius=calculateOffset(config, 1*data[i].value, calculatedScale, scaleHop)/2+config.inGraphDataPaddingRadius;
                         else if(config.inGraphDataRadiusPosition==3)labelRadius=calculateOffset(config, 1*data[i].value, calculatedScale, scaleHop)+config.inGraphDataPaddingRadius;
                         else if(config.inGraphDataRadiusPosition==4)labelRadius=scaleHop*calculatedScale.steps+config.inGraphDataPaddingRadius;

                         
  				        	     ctx.save()
           
                         if(config.inGraphDataAlign=="off-center"){
                           if(config.inGraphDataRotate=="inRadiusAxis" || (posAngle+2*Math.PI)%(2*Math.PI) > 3*Math.PI/2 || (posAngle+2*Math.PI)%(2*Math.PI) < Math.PI/2)ctx.textAlign = "left";
                           else ctx.textAlign="right";
                         }
                         else if(config.inGraphDataAlign=="to-center"){
                           if(config.inGraphDataRotate=="inRadiusAxis" || (posAngle+2*Math.PI)%(2*Math.PI) > 3*Math.PI/2 || (posAngle+2*Math.PI)%(2*Math.PI) < Math.PI/2)ctx.textAlign = "right";
                           else ctx.textAlign="left";
                         }
   					             else ctx.textAlign = config.inGraphDataAlign;  
                         if(config.inGraphDataVAlign=="off-center"){
                            if((posAngle+2*Math.PI)%(2*Math.PI)>Math.PI)ctx.textBaseline = "top";
                            else ctx.textBaseline = "bottom";
                         }
                         else if(config.inGraphDataVAlign=="to-center"){
                            if((posAngle+2*Math.PI)%(2*Math.PI)>Math.PI)ctx.textBaseline = "bottom";
                            else ctx.textBaseline = "top";
                         }
                         else ctx.textBaseline = config.inGraphDataVAlign;

           				       ctx.font = config.inGraphDataFontStyle + ' ' + config.inGraphDataFontSize + 'px ' + config.inGraphDataFontFamily;
	    		               ctx.fillStyle = config.inGraphDataFontColor;

                         var dispString = tmplbis(config.inGraphDataTmpl, { config:config, v1 : fmtChartJS(config,lgtxt,config.fmtV1), v2 : fmtChartJS(config,1*data[i].value,config.fmtV2), v3 : fmtChartJS(config,cumvalue,config.fmtV3), v4 : fmtChartJS(config,totvalue,config.fmtV4), v5 : fmtChartJS(config,angleStep,config.fmtV5), v6 : roundToWithThousands(config,fmtChartJS(config,100 * data[i].value / totvalue,config.fmtV6),config.roundPct), v7 : fmtChartJS(config,midPosX,config.fmtV7),v8 : fmtChartJS(config,midPosY,config.fmtV8),v9 : fmtChartJS(config,0,config.fmtV9),v10 : fmtChartJS(config,calculateOffset(config, 1*data[i].value, calculatedScale, scaleHop),config.fmtV10),v11 : fmtChartJS(config,startAngle - angleStep,config.fmtV11),v12 : fmtChartJS(config,angleStep,config.fmtV12),v13 : fmtChartJS(config,i,config.fmtV13)});
                         ctx.translate(midPosX + labelRadius*Math.cos(posAngle), midPosY - labelRadius*Math.sin(posAngle));
                         
                         if(config.inGraphDataRotate=="inRadiusAxis")ctx.rotate(2*Math.PI-posAngle);
                         else if(config.inGraphDataRotate=="inRadiusAxisRotateLabels")
                         {
                          if ((posAngle+2*Math.PI)%(2*Math.PI)>Math.PI/2 && (posAngle+2*Math.PI)%(2*Math.PI)<3*Math.PI/2)ctx.rotate(3*Math.PI-posAngle);
                          else ctx.rotate(2*Math.PI-posAngle); 
                         }
                         else ctx.rotate(config.inGraphDataRotate * (Math.PI / 180));
  			     			       
                         ctx.fillText(dispString, 0,0);
                         ctx.restore();
                         realStartAngle-=angleStep;
                    }                }
              }
            }


        } ;



        function drawScale() {
            for (var i = 0; i < calculatedScale.steps; i++) {
                //If the line object is there
                if (config.scaleShowLine) {
                    ctx.beginPath();
                    ctx.arc(midPosX, midPosY, scaleHop * (i + 1), 0, (Math.PI * 2), true);
                    ctx.strokeStyle = config.scaleLineColor;
                    ctx.lineWidth = config.scaleLineWidth;
                    ctx.stroke();
                }

                if (config.scaleShowLabels) {
                    ctx.textAlign = "center";
                    ctx.font = config.scaleFontStyle + " " + config.scaleFontSize + "px " + config.scaleFontFamily;
                    var label = calculatedScale.labels[i + 1];
                    //If the backdrop object is within the font object
                    if (config.scaleShowLabelBackdrop) {
                        var textWidth = ctx.measureText(label).width;
                        ctx.fillStyle = config.scaleBackdropColor;
                        ctx.beginPath();
                        ctx.rect(
							Math.round(midPosX - textWidth / 2 - config.scaleBackdropPaddingX),     //X
							Math.round(midPosY - (scaleHop * (i + 1)) - config.scaleFontSize * 0.5 - config.scaleBackdropPaddingY),//Y
							Math.round(textWidth + (config.scaleBackdropPaddingX * 2)), //Width
							Math.round(config.scaleFontSize + (config.scaleBackdropPaddingY * 2)) //Height
						);
                        ctx.fill();
                    }
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = config.scaleFontColor;
                    ctx.fillText(label, midPosX, midPosY - (scaleHop * (i + 1)));
                }
            }
        } ;
        function getValueBounds() {
            var upperValue = Number.MIN_VALUE;
            var lowerValue = Number.MAX_VALUE;
            for (var i = 0; i < data.length; i++) {
                if (1*data[i].value > upperValue) { upperValue = 1*data[i].value; }
                if (1*data[i].value < lowerValue) { lowerValue = 1*data[i].value; }
            };

			if (Math.abs(upperValue - lowerValue)<0.00000001) {
				upperValue = Max([upperValue*2,1]);
				lowerValue = 0;
			}

            if (!isNaN(config.graphMin)) lowerValue = config.graphMin;
            if (!isNaN(config.graphMax)) upperValue = config.graphMax;

            var maxSteps = Math.floor((scaleHeight / (labelHeight * 0.66)));
            var minSteps = Math.floor((scaleHeight / labelHeight * 0.5));

            return {
                maxValue: upperValue,
                minValue: lowerValue,
                maxDailySteps: maxSteps,
                minSteps: minSteps
            };


        } ;
    } ;

    var Radar = function (data, config, ctx) {
        var maxSize, scaleHop, calculatedScale, labelHeight, scaleHeight, valueBounds, labelTemplateString, msr, midPosX, midPosY;

        if (!dynamicFunction(data,config,ctx,"Radar"))return;

        while (config.startAngle < 0){config.startAngle+=360;}
        while (config.startAngle > 360){config.startAngle-=360;}
        
        config.logarithmic = false;

        var annotateCnt = 0;
        jsGraphAnnotate[ctx.canvas.id] = new Array();

        defMouse(ctx,data,config,"Radar");

        //If no labels are defined set to an empty array, so referencing length for looping doesn't blow up.
        if (!data.labels) data.labels = [];

        setRect(ctx,config);
        
        valueBounds = getValueBounds();
        //Check and set the scale
        labelTemplateString = (config.scaleShowLabels) ? config.scaleLabel : "";

        if (!config.scaleOverride) {

            calculatedScale = calculateScale(config, valueBounds.maxDailySteps, valueBounds.minSteps, valueBounds.maxValue, valueBounds.minValue, labelTemplateString);
            msr = setMeasures(data, config, ctx, height, width, calculatedScale.labels, true, false, false, true);
        }
        else {
            calculatedScale = {
                steps: config.scaleSteps,
                stepValue: config.scaleStepWidth,
                graphMin: config.scaleStartValue,
                graphMax: config.scaleStartValue+config.scaleSteps*config.scaleStepWidth,
                labels: []
            }
            populateLabels(config, labelTemplateString, calculatedScale.labels, calculatedScale.steps, config.scaleStartValue, calculatedScale.graphMax, config.scaleStepWidth);
            msr = setMeasures(data, config, ctx, height, width, calculatedScale.labels, true, false, false, true);
        }

        calculateDrawingSizes();

        midPosY = msr.topNotUsableSize + (msr.availableHeight / 2);
        scaleHop = maxSize / (calculatedScale.steps);

        //Wrap in an animation loop wrapper
        animationLoop(config, drawScale, drawAllDataPoints, ctx, msr.clrx, msr.clry, msr.clrwidth, msr.clrheight, midPosX, midPosY, midPosX - maxSize, midPosY + maxSize, data);

        //Radar specific functions.
        function drawAllDataPoints(animationDecimal) {

            var totvalue = new Array();
            var maxvalue = new Array();

            for (var i = 0; i < data.datasets.length; i++) { for (var j = 0; j < data.datasets[i].data.length; j++) { totvalue[j] = 0; maxvalue[j] = -999999999; } }
            for (var i = 0; i < data.datasets.length; i++) { for (var j = 0; j < data.datasets[i].data.length; j++) { if (!(typeof(data.datasets[i].data[j])=='undefined')){totvalue[j] += 1*data.datasets[i].data[j]; maxvalue[j] = Max([maxvalue[j], 1*data.datasets[i].data[j]]); } } }

            var rotationDegree = (2 * Math.PI) / data.datasets[0].data.length;

            ctx.save();

            //We accept multiple data sets for radar charts, so show loop through each set
            for (var i = 0; i < data.datasets.length; i++) {

                if (animationDecimal >= 1) {
                    if (typeof (data.datasets[i].title) == "string") lgtxt = data.datasets[i].title.trim();
                    else lgtxt = "";
                }
                var fPt=-1;

                
                for (var j = 0; j < data.datasets[i].data.length; j++) {
                  if (!(typeof(data.datasets[i].data[j])=='undefined')) {
                     if (fPt==-1)
                     {
                        ctx.beginPath();
                        ctx.moveTo(midPosX + animationDecimal *(Math.cos(config.startAngle*Math.PI/180 - j * rotationDegree) * calculateOffset(config, data.datasets[i].data[j], calculatedScale, scaleHop)), midPosY - animationDecimal *(Math.sin(config.startAngle*Math.PI/180 - j * rotationDegree) * calculateOffset(config, data.datasets[i].data[j], calculatedScale, scaleHop)));
                        fPt=j;
                     }
                     else 
                     {
                        ctx.lineTo(midPosX + animationDecimal *(Math.cos(config.startAngle*Math.PI/180 - j * rotationDegree) * calculateOffset(config, data.datasets[i].data[j], calculatedScale, scaleHop)), midPosY - animationDecimal *(Math.sin(config.startAngle*Math.PI/180 - j * rotationDegree) * calculateOffset(config, data.datasets[i].data[j], calculatedScale, scaleHop)));
                     }
                
                     if (animationDecimal >= 1) {
                        if (i == 0) divprev = 0;
                        else divprev = data.datasets[i].data[j] - data.datasets[i - 1].data[j];
                        if (i == data.datasets.length - 1) divnext = 0;
                        else divnext = data.datasets[i + 1].data[j] - data.datasets[i].data[j];
                        if (typeof (data.labels[j]) == "string") lgtxt2 = data.labels[j].trim();
                        else lgtxt2 = "";
                        jsGraphAnnotate[ctx.canvas.id][annotateCnt++] = ["POINT", midPosX + Math.cos(config.startAngle*Math.PI/180 - j * rotationDegree) * calculateOffset(config, data.datasets[i].data[j], calculatedScale, scaleHop), midPosY - Math.sin(config.startAngle*Math.PI/180 - j * rotationDegree) * calculateOffset(config, data.datasets[i].data[j], calculatedScale, scaleHop), lgtxt, lgtxt2, 1*data.datasets[i].data[j], divprev, divnext, maxvalue[j], totvalue[j], i, j];
                     }
                   }
                }

                ctx.closePath();

                ctx.fillStyle = data.datasets[i].fillColor;
                ctx.strokeStyle = data.datasets[i].strokeColor;
                ctx.lineWidth = config.datasetStrokeWidth;
                ctx.fill();
                ctx.stroke();

                if (config.pointDot) {
                    ctx.beginPath();
                    ctx.fillStyle = data.datasets[i].pointColor;
                    ctx.strokeStyle = data.datasets[i].pointStrokeColor;
                    ctx.lineWidth = config.pointDotStrokeWidth;
                    for (var k = 0; k < data.datasets[i].data.length; k++) {
                      if (!(typeof(data.datasets[i].data[k])=='undefined')) {
                        ctx.beginPath();
                        ctx.arc(midPosX + animationDecimal *(Math.cos(config.startAngle*Math.PI/180 - k * rotationDegree) * calculateOffset(config, data.datasets[i].data[k], calculatedScale, scaleHop)), midPosY - animationDecimal * (Math.sin(config.startAngle*Math.PI/180 - k * rotationDegree) * calculateOffset(config, data.datasets[i].data[k], calculatedScale, scaleHop)), config.pointDotRadius, 2 * Math.PI, false);
                        ctx.fill();
                        ctx.stroke();
                      }
                    }

                }
            }
            ctx.restore();

		        if (animationDecimal >= 1 && config.inGraphDataShow) {
              for (var i = 0; i < data.datasets.length; i++) {
                  if (typeof (data.datasets[i].title) == "string") lgtxt = data.datasets[i].title.trim();
                  else lgtxt = "";
                
                  for (var j = 0; j < data.datasets[i].data.length; j++) {
                    if (!(typeof(data.datasets[i].data[j])=='undefined')) {
 
                       if (i == 0) divprev = 0;
                       else divprev = data.datasets[i].data[j] - data.datasets[i - 1].data[j];
                       if (i == data.datasets.length - 1) divnext = 0;
                       else divnext = data.datasets[i + 1].data[j] - data.datasets[i].data[j];
 
                       if (typeof (data.labels[j]) == "string") lgtxt2 = data.labels[j].trim();
                       else lgtxt2 = "";

  				        	   ctx.save();
   					           ctx.textAlign = config.inGraphDataAlign;
                       ctx.textBaseline = config.inGraphDataVAlign;

                         if(config.inGraphDataAlign=="off-center"){
                           if(config.inGraphDataRotate=="inRadiusAxis" || (j * rotationDegree+2*Math.PI)%(2*Math.PI) > 3*Math.PI/2 || (j * rotationDegree+2*Math.PI)%(2*Math.PI) < Math.PI/2)ctx.textAlign = "left";
                           else ctx.textAlign="right";
                         }
                         else if(config.inGraphDataAlign=="to-center"){
                           if(config.inGraphDataRotate=="inRadiusAxis" || (j * rotationDegree+2*Math.PI)%(2*Math.PI) > 3*Math.PI/2 || (j * rotationDegree+2*Math.PI)%(2*Math.PI) < Math.PI/2)ctx.textAlign = "right";
                           else ctx.textAlign="left";
                         }
   					             else ctx.textAlign = config.inGraphDataAlign;  
                         if(config.inGraphDataVAlign=="off-center"){
                            if((j * rotationDegree+2*Math.PI)%(2*Math.PI)>Math.PI)ctx.textBaseline = "bottom";
                            else ctx.textBaseline = "top";
                         }
                         else if(config.inGraphDataVAlign=="to-center"){
                            if((j * rotationDegree+2*Math.PI)%(2*Math.PI)>Math.PI)ctx.textBaseline = "top";
                            else ctx.textBaseline = "bottom";
                         }
                         else ctx.textBaseline = config.inGraphDataVAlign;

           	           ctx.font = config.inGraphDataFontStyle + ' ' + config.inGraphDataFontSize + 'px ' + config.inGraphDataFontFamily;
	    		             ctx.fillStyle = config.inGraphDataFontColor;

                       var radiusPrt;
                       if(config.inGraphDataRadiusPosition==1)radiusPrt=0+config.inGraphDataPaddingRadius;
                       else if(config.inGraphDataRadiusPosition==2)radiusPrt=(calculateOffset(config, data.datasets[i].data[j], calculatedScale, scaleHop))/2+config.inGraphDataPaddingRadius;
                       else if(config.inGraphDataRadiusPosition==3)radiusPrt=(calculateOffset(config, data.datasets[i].data[j], calculatedScale, scaleHop))+config.inGraphDataPaddingRadius;

                       ctx.translate(midPosX + Math.cos(config.startAngle*Math.PI/180 - j * rotationDegree) * radiusPrt, midPosY - Math.sin(config.startAngle*Math.PI/180 - j * rotationDegree) * radiusPrt);

                       if(config.inGraphDataRotate=="inRadiusAxis")ctx.rotate(j * rotationDegree);
                       else if(config.inGraphDataRotate=="inRadiusAxisRotateLabels"){
                          if ((j * rotationDegree+2*Math.PI)%(2*Math.PI)>Math.PI/2 && (j * rotationDegree+2*Math.PI)%(2*Math.PI)<3*Math.PI/2)ctx.rotate(3*Math.PI+j * rotationDegree);
                          else ctx.rotate(2*Math.PI+j * rotationDegree); 
                       } 
                       else ctx.rotate(config.inGraphDataRotate * (Math.PI / 180));

                       var dispString = tmplbis(config.inGraphDataTmpl, { config:config, v1 : fmtChartJS(config,lgtxt,config.fmtV1), v2 : fmtChartJS(config,lgtxt2,config.fmtV2), v3 : fmtChartJS(config,1*data.datasets[i].data[j],config.fmtV3), v4 : fmtChartJS(config,divprev,config.fmtV4), v5 : fmtChartJS(config,divnext,config.fmtV5), v6 : fmtChartJS(config,maxvalue[j],config.fmtV6), v7 : fmtChartJS(config,totvalue[j],config.fmtV7), v8 : roundToWithThousands(config,fmtChartJS(config,100 * data.datasets[i].data[j] / totvalue[j],config.fmtV8),config.roundPct),v9 : fmtChartJS(config,midPosX + Math.cos(config.startAngle*Math.PI/180 - j * rotationDegree) * calculateOffset(config, data.datasets[i].data[j], calculatedScale, scaleHop),config.fmtV9),v10 : fmtChartJS(config,midPosY - Math.sin(config.startAngle*Math.PI/180 - j * rotationDegree) * calculateOffset(config, data.datasets[i].data[j], calculatedScale, scaleHop),config.fmtV10),v11 : fmtChartJS(config,i,config.fmtV11), v12 : fmtChartJS(config,j,config.fmtV12)});
 	         
                       ctx.fillText(dispString, 0,0);
                       ctx.restore();              

                    }
                  }
              }
            }


        } ;
        function drawScale() {

            var rotationDegree = (2 * Math.PI) / data.datasets[0].data.length;
            ctx.save();
            ctx.translate(midPosX, midPosY);
            
            ctx.rotate((90-config.startAngle)*Math.PI/180);
    
            if (config.angleShowLineOut) {
                ctx.strokeStyle = config.angleLineColor;
                ctx.lineWidth = config.angleLineWidth;
                for (var h = 0; h < data.datasets[0].data.length; h++) {

                    ctx.rotate(rotationDegree);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(0, -maxSize);
                    ctx.stroke();
                }
            }

            for (var i = 0; i < calculatedScale.steps; i++) {
                ctx.beginPath();

                if (config.scaleShowLine) {
                    ctx.strokeStyle = config.scaleLineColor;
                    ctx.lineWidth = config.scaleLineWidth;
                    ctx.moveTo(0, -scaleHop * (i + 1));
                    for (var j = 0; j < data.datasets[0].data.length; j++) {
                        ctx.rotate(rotationDegree);
                        ctx.lineTo(0, -scaleHop * (i + 1));
                    }
                    ctx.closePath();
                    ctx.stroke();

                }
            }

            ctx.rotate(-(90-config.startAngle)*Math.PI/180);
            if (config.scaleShowLabels) {
              for (var i = 0; i < calculatedScale.steps; i++) {

                    ctx.textAlign = 'center';
                    ctx.font = config.scaleFontStyle + " " + config.scaleFontSize + "px " + config.scaleFontFamily;
                    ctx.textBaseline = "middle";

                    if (config.scaleShowLabelBackdrop) {
                        var textWidth = ctx.measureText(calculatedScale.labels[i + 1]).width;
                        ctx.fillStyle = config.scaleBackdropColor;
                        ctx.beginPath();
                        ctx.rect(
              							Math.round(Math.cos(config.startAngle*Math.PI/180)* (scaleHop * (i + 1))-textWidth / 2 - config.scaleBackdropPaddingX),     //X
							              Math.round((-Math.sin(config.startAngle*Math.PI/180)*scaleHop * (i + 1)) - config.scaleFontSize * 0.5 - config.scaleBackdropPaddingY),//Y
							              Math.round(textWidth + (config.scaleBackdropPaddingX * 2)), //Width
							              Math.round(config.scaleFontSize + (config.scaleBackdropPaddingY * 2)) //Height
            						);
                        ctx.fill();
                    }
                    ctx.fillStyle = config.scaleFontColor;
                    ctx.fillText(calculatedScale.labels[i + 1], Math.cos(config.startAngle*Math.PI/180)* (scaleHop * (i + 1)), -Math.sin(config.startAngle*Math.PI/180)*scaleHop * (i + 1));
                }
            }

            for (var k = 0; k < data.labels.length; k++) {
                ctx.font = config.pointLabelFontStyle + " " + config.pointLabelFontSize + "px " + config.pointLabelFontFamily;
                ctx.fillStyle = config.pointLabelFontColor;
                var opposite = Math.sin((90-config.startAngle)*Math.PI/180+rotationDegree * k) * (maxSize + config.pointLabelFontSize);
                var adjacent = Math.cos((90-config.startAngle)*Math.PI/180+rotationDegree * k) * (maxSize + config.pointLabelFontSize);

                var vangle=(90-config.startAngle)*Math.PI/180+rotationDegree * k;
                while(vangle<0)vangle=vangle+2*Math.PI;
                while(vangle>2*Math.PI)vangle=vangle-2*Math.PI;
               

                if (vangle == Math.PI || vangle == 0) {
                    ctx.textAlign = "center";
                }
                else if (vangle > Math.PI) {
                    ctx.textAlign = "right";
                }
                else {
                    ctx.textAlign = "left";
                }

                ctx.textBaseline = "middle";

                ctx.fillText(data.labels[k], opposite, -adjacent);

            }
            ctx.restore();
        };

        function calculateDrawingSizes() {
            var midX, mxlb,maxL,maxR,iter,nbiter,prevMaxSize,prevMidX;                        

            var rotationDegree = (2 * Math.PI) / data.datasets[0].data.length;
            var rotateAngle=config.startAngle*Math.PI/180;

            // Compute range for Mid Point of graph
            ctx.font = config.pointLabelFontStyle + " " + config.pointLabelFontSize + "px " + config.pointLabelFontFamily;
            if(!config.graphMaximized) {
              maxR=msr.availableWidth/2;
              maxL=msr.availableWidth/2;
              nbiter=1;
            }
            else {
              maxR=msr.availableWidth/2;
              maxL=msr.availableWidth/2;
              nbiter=40;
              for (var i = 0; i < data.labels.length; i++) {
                var textMeasurement = ctx.measureText(data.labels[i]).width+config.scaleFontSize;
                mxlb=(msr.availableWidth-textMeasurement)/(1+Math.abs(Math.cos(rotateAngle)));
                if((rotateAngle < Math.PI/2 && rotateAngle > -Math.PI/2) || rotateAngle > 3*Math.PI/2){
                  if (mxlb<maxR)maxR=mxlb;
                }
                else if (Math.cos(rotateAngle) !=0){
                  if (mxlb<maxL)maxL=mxlb;
                }
                rotateAngle-=rotationDegree;                
              }
            }

            // compute max Radius and midPoint in that range
            prevMaxSize=0;
            prevMidX=0;
            for (midX=maxR,iter=0;iter<nbiter; ++iter, midX+=(msr.availableWidth-maxL-maxR)/nbiter){            
              maxSize=Max([midX,msr.availableWidth-midX]);
              var rotateAngle=config.startAngle*Math.PI/180;
              mxlb=msr.available;
              for (var i = 0; i < data.labels.length; i++) {
                var textMeasurement = ctx.measureText(data.labels[i]).width+config.scaleFontSize;
                if((rotateAngle < Math.PI/2 && rotateAngle > -Math.PI/2) || rotateAngle > 3*Math.PI/2){
                  mxlb=((msr.availableWidth-midX)- textMeasurement)/Math.abs(Math.cos(rotateAngle));
                }
                else if (Math.cos(rotateAngle!=0)){
                  mxlb=(midX- textMeasurement)/Math.abs(Math.cos(rotateAngle));
                }
                if (mxlb < maxSize)maxSize=mxlb;
                if(Math.sin(rotateAngle)*msr.availableHeight/2 > msr.availableHeight/2 - config.scaleFontSize*2){
                    mxlb=Math.sin(rotateAngle)*msr.availableHeight/2-1.5*config.scaleFontSize;
                    if(mxlb < maxSize)maxSize=mxlb;
                } 
                rotateAngle-=rotationDegree;                
              }
              if(maxSize>prevMaxSize){
                prevMaxSize=maxSize;
                midPosX=midX;
              }
            }
            
            maxSize =prevMaxSize - config.scaleFontSize/2;      
            //If the label height is less than 5, set it to 5 so we don't have lines on top of each other.
            labelHeight = Default(labelHeight, 5);
        };


        function getValueBounds() {
            var upperValue = Number.MIN_VALUE;
            var lowerValue = Number.MAX_VALUE;

            for (var i = 0; i < data.datasets.length; i++) {
                for (var j = 0; j < data.datasets[i].data.length; j++) {
                    if (1*data.datasets[i].data[j] > upperValue) { upperValue = 1*data.datasets[i].data[j] }
                    if (1*data.datasets[i].data[j] < lowerValue) { lowerValue = 1*data.datasets[i].data[j] }
                }
            }

			if (Math.abs(upperValue - lowerValue)<0.00000001) {
				upperValue = Max([upperValue*2,1]);
				lowerValue = 0;
			}

            if (!isNaN(config.graphMin)) lowerValue = config.graphMin;
            if (!isNaN(config.graphMax)) upperValue = config.graphMax;

            var maxSteps = Math.floor((scaleHeight / (labelHeight * 0.66)));
            var minSteps = Math.floor((scaleHeight / labelHeight * 0.5));

            return {
                maxValue: upperValue,
                minValue: lowerValue,
                maxDailySteps: maxSteps,
                minSteps: minSteps
            };
        }
    } ;


    var Pie = function (data, config, ctx) {
        var segmentTotal = 0;
        var msr, midPieX, midPieY,pieRadius;

        if (!dynamicFunction(data,config,ctx,"Pie"))return;

        while (config.startAngle < 0){config.startAngle+=360;}
        while (config.startAngle > 360){config.startAngle-=360;}

        config.logarithmic = false;

        var annotateCnt = 0;
        jsGraphAnnotate[ctx.canvas.id] = new Array();

        defMouse(ctx,data,config,"Pie");

        //In case we have a canvas that is not a square. Minus 5 pixels as padding round the edge.

        setRect(ctx,config);

        msr = setMeasures(data, config, ctx, height, width, null, true, false, false, false);

//        midPieX = msr.leftNotUsableSize + (msr.availableWidth / 2);
//        midPieY = msr.topNotUsableSize + (msr.availableHeight / 2);
//        pieRadius = Min([msr.availableHeight / 2, msr.availableWidth / 2]) - 5;

        for (var i = 0; i < data.length; i++) {
            if (!(typeof(data[i].value)=='undefined'))segmentTotal += 1*data[i].value;
        }
        
        calculateDrawingSize();

        animationLoop(config, null, drawPieSegments, ctx, msr.clrx, msr.clry, msr.clrwidth, msr.clrheight, midPieX, midPieY, midPieX - pieRadius, midPieY + pieRadius, data);



        function drawPieSegments(animationDecimal) {



            var cumulativeAngle = -config.startAngle * (Math.PI / 180)+2*Math.PI ,
               cumvalue = 0,
			         scaleAnimation = 1,
			         rotateAnimation = 1;
               
            var realCumulativeAngle=config.startAngle* (Math.PI / 180)+2*Math.PI;
 
            while (cumulativeAngle < 0){cumulativeAngle+=2*Math.PI;}
            while (cumulativeAngle > 2*Math.PI){cumulativeAngle-=2*Math.PI;}

            while (realCumulativeAngle < 0){realCumulativeAngle+=2*Math.PI;}
            while (realCumulativeAngle > 2*Math.PI){realCumulativeAngle-=2*Math.PI;}

            if (config.animation) {
                if (config.animateScale) {
                    scaleAnimation = animationDecimal;
                }
                if (config.animateRotate) {
                    rotateAnimation = animationDecimal;
                }
            }
            if (animationDecimal >= 1) {
                totvalue = 0;
                for (var i = 0; i < data.length; i++) if (!(typeof(data[i].value)=='undefined'))totvalue += 1*data[i].value;
            }

            for (var i = 0; i < data.length; i++) {
              if (!(typeof(data[i].value)=='undefined')){                
                var segmentAngle = rotateAnimation * ((1*data[i].value / segmentTotal) * (Math.PI * 2));
                if(segmentAngle >= Math.PI*2)segmentAngle=Math.PI*2-0.001;  // bug on Android when segmentAngle is >= 2*PI;
                ctx.beginPath();
                ctx.arc(midPieX, midPieY, scaleAnimation * pieRadius, cumulativeAngle, cumulativeAngle+segmentAngle );

                ctx.lineTo(midPieX, midPieY);
                ctx.closePath();
                ctx.fillStyle = data[i].color;
                ctx.fill();
                cumulativeAngle += segmentAngle;
                
                cumvalue += 1*data[i].value;

                if (config.segmentShowStroke) {
                    ctx.lineWidth = config.segmentStrokeWidth;
                    ctx.strokeStyle = config.segmentStrokeColor;
                    ctx.stroke();
                }

                if (animationDecimal >= 1) {
                    if (typeof (data[i].title) == "string") lgtxt = data[i].title.trim();
                    else lgtxt = "";
                    jsGraphAnnotate[ctx.canvas.id][annotateCnt++] = ["ARC", midPieX, midPieY, 0, pieRadius, cumulativeAngle - segmentAngle, cumulativeAngle, lgtxt, 1*data[i].value, cumvalue, totvalue, segmentAngle, i];


                    if (config.inGraphDataShow) {
                    
                         if(config.inGraphDataAnglePosition==1)posAngle=realCumulativeAngle+config.inGraphDataPaddingAngle*(Math.PI/180);
                         else if(config.inGraphDataAnglePosition==2)posAngle=realCumulativeAngle-segmentAngle/2+config.inGraphDataPaddingAngle*(Math.PI/180);
                         else if(config.inGraphDataAnglePosition==3)posAngle=realCumulativeAngle-segmentAngle+config.inGraphDataPaddingAngle*(Math.PI/180);

                         if(config.inGraphDataRadiusPosition==1)labelRadius=0+config.inGraphDataPaddingRadius;
                         else if(config.inGraphDataRadiusPosition==2)labelRadius=pieRadius/2+config.inGraphDataPaddingRadius;
                         else if(config.inGraphDataRadiusPosition==3)labelRadius=pieRadius+config.inGraphDataPaddingRadius;

                         realCumulativeAngle -= segmentAngle;

                         
  				        	     ctx.save();
           
                         if(config.inGraphDataAlign=="off-center"){
                           if(config.inGraphDataRotate=="inRadiusAxis" || (posAngle+2*Math.PI)%(2*Math.PI) > 3*Math.PI/2 || (posAngle+2*Math.PI)%(2*Math.PI) < Math.PI/2)ctx.textAlign = "left";
                           else ctx.textAlign="right";
                         }
                         else if(config.inGraphDataAlign=="to-center"){
                           if(config.inGraphDataRotate=="inRadiusAxis" || (posAngle+2*Math.PI)%(2*Math.PI) > 3*Math.PI/2 || (posAngle+2*Math.PI)%(2*Math.PI) < Math.PI/2)ctx.textAlign = "right";
                           else ctx.textAlign="left";
                         }
   					             else ctx.textAlign = config.inGraphDataAlign;  
                         if(config.inGraphDataVAlign=="off-center"){
                            if((posAngle+2*Math.PI)%(2*Math.PI)>Math.PI)ctx.textBaseline = "top";
                            else ctx.textBaseline = "bottom";
                         }
                         else if(config.inGraphDataVAlign=="to-center"){
                            if((posAngle+2*Math.PI)%(2*Math.PI)>Math.PI)ctx.textBaseline = "bottom";
                            else ctx.textBaseline = "top";
                         }
                         else ctx.textBaseline = config.inGraphDataVAlign;

           				       ctx.font = config.inGraphDataFontStyle + ' ' + config.inGraphDataFontSize + 'px ' + config.inGraphDataFontFamily;
	    		               ctx.fillStyle = config.inGraphDataFontColor;

                         var dispString = tmplbis(config.inGraphDataTmpl, { config:config, v1 : fmtChartJS(config,lgtxt,config.fmtV1), v2 : fmtChartJS(config,1*data[i].value,config.fmtV2), v3 : fmtChartJS(config,cumvalue,config.fmtV3), v4 : fmtChartJS(config,totvalue,config.fmtV4), v5 : fmtChartJS(config,segmentAngle,config.fmtV5), v6 : roundToWithThousands(config, fmtChartJS(config,100 * data[i].value / totvalue,config.fmtV6), config.roundPct), v7 : fmtChartJS(config,midPieX,config.fmtV7),v8 : fmtChartJS(config,midPieY,config.fmtV8),v9 : fmtChartJS(config,0,config.fmtV9),v10 : fmtChartJS(config,pieRadius,config.fmtV10),v11 : fmtChartJS(config,cumulativeAngle-segmentAngle,config.fmtV11),v12 : fmtChartJS(config,cumulativeAngle,config.fmtV12),v13 : fmtChartJS(config,i,config.fmtV13)});
                         ctx.translate(midPieX + labelRadius*Math.cos(posAngle), midPieY - labelRadius*Math.sin(posAngle));
                         
                         if(config.inGraphDataRotate=="inRadiusAxis")ctx.rotate(2*Math.PI-posAngle);
                         else if(config.inGraphDataRotate=="inRadiusAxisRotateLabels")
                         {
                          if ((posAngle+2*Math.PI)%(2*Math.PI)>Math.PI/2 && (posAngle+2*Math.PI)%(2*Math.PI)<3*Math.PI/2)ctx.rotate(3*Math.PI-posAngle);
                          else ctx.rotate(2*Math.PI-posAngle); 
                         }
                         else ctx.rotate(config.inGraphDataRotate * (Math.PI / 180));
  			     			       
                          ctx.fillText(dispString, 0,0);
                         ctx.restore();
                    }
                }
              }
            }
        };

        function calculateDrawingSize() {

            var lgtxt;

            var cumulativeAngle = -config.startAngle * (Math.PI / 180)+2*Math.PI ,
               cumvalue = 0;
 
            while (cumulativeAngle < 0){cumulativeAngle+=2*Math.PI;}
            while (cumulativeAngle > 2*Math.PI){cumulativeAngle-=2*Math.PI;}

            
            midPieX = msr.leftNotUsableSize + (msr.availableWidth / 2);
            midPieY = msr.topNotUsableSize + (msr.availableHeight / 2);
            pieRadius = Min([msr.availableHeight / 2, msr.availableWidth / 2]) - 5;


            // Computerange Pie Radius

            ctx.font = config.pointLabelFontStyle + " " + config.pointLabelFontSize + "px " + config.pointLabelFontFamily;
            if(config.inGraphDataShow && config.inGraphDataRadiusPosition==3 && config.inGraphDataAlign=="off-center" && config.inGraphDataRotate==0) {
                pieRadius = Min([msr.availableHeight / 2, msr.availableWidth / 2]) - config.inGraphDataFontSize - config.inGraphDataPaddingRadius -5;
              
                var realCumulativeAngle=config.startAngle* (Math.PI / 180)+2*Math.PI;
 
                while (realCumulativeAngle < 0){realCumulativeAngle+=2*Math.PI;}
                while (realCumulativeAngle > 2*Math.PI){realCumulativeAngle-=2*Math.PI;}

                var totvalue = 0;
                for (var i = 0; i < data.length; i++) if (!(typeof(data[i].value)=='undefined'))totvalue += 1*data[i].value;

       			    ctx.font = config.inGraphDataFontStyle + ' ' + config.inGraphDataFontSize + 'px ' + config.inGraphDataFontFamily;
                var cumvalue=0;
                var posAngle;
                for (var i = 0; i < data.length; i++) {
                  if (!(typeof(data[i].value)=='undefined')) {
                  cumvalue += 1*data[i].value;
                  var segmentAngle = (1*data[i].value / segmentTotal) * (Math.PI * 2);
                  cumulativeAngle += segmentAngle;

                  if(config.inGraphDataAnglePosition==1)posAngle=realCumulativeAngle+config.inGraphDataPaddingAngle*(Math.PI/180);
                  else if(config.inGraphDataAnglePosition==2)posAngle=realCumulativeAngle-segmentAngle/2+config.inGraphDataPaddingAngle*(Math.PI/180);
                  else if(config.inGraphDataAnglePosition==3)posAngle=realCumulativeAngle-segmentAngle+config.inGraphDataPaddingAngle*(Math.PI/180);
                  realCumulativeAngle -= segmentAngle;

                  if (typeof (data[i].title) == "string") lgtxt = data[i].title.trim();
                  else lgtxt = "";
                  var dispString = tmplbis(config.inGraphDataTmpl, { config:config, v1 : fmtChartJS(config,lgtxt,config.fmtV1), v2 : fmtChartJS(config,1*data[i].value,config.fmtV2), v3 : fmtChartJS(config,cumvalue,config.fmtV3), v4 : fmtChartJS(config,totvalue,config.fmtV4), v5 : fmtChartJS(config,segmentAngle,config.fmtV5), v6 : roundToWithThousands(config, fmtChartJS(config,100 * data[i].value / totvalue,config.fmtV6), config.roundPct), v7 : fmtChartJS(config,midPieX,config.fmtV7),v8 : fmtChartJS(config,midPieY,config.fmtV8),v9 : fmtChartJS(config,0,config.fmtV9),v10 : fmtChartJS(config,pieRadius,config.fmtV10),v11 : fmtChartJS(config,cumulativeAngle-segmentAngle,config.fmtV11),v12 : fmtChartJS(config,cumulativeAngle,config.fmtV12),v13 : fmtChartJS(config,i,config.fmtV13)});
                  var textMeasurement = ctx.measureText(dispString).width;
                
                  var MaxRadiusX=  Math.abs((msr.availableWidth / 2 - textMeasurement)/Math.cos(posAngle))-config.inGraphDataPaddingRadius -5;
                  if(MaxRadiusX<pieRadius)pieRadius=MaxRadiusX;
                  }
                }

            }
            pieRadius=pieRadius*config.radiusScale;


        };


    } ;

    var Doughnut = function (data, config, ctx) {
        var segmentTotal = 0;
        var msr, midPieX, midPieY;

        if (!dynamicFunction(data,config,ctx,"Doughnut"))return;
        
        var realCumulativeAngle=config.startAngle* (Math.PI / 180)+2*Math.PI;

        while (config.startAngle < 0){config.startAngle+=360;}
        while (config.startAngle > 360){config.startAngle-=360;}

        while (realCumulativeAngle < 0){realCumulativeAngle+=2*Math.PI;}
        while (realCumulativeAngle > 2*Math.PI){realCumulativeAngle-=2*Math.PI;}


        config.logarithmic = false;


        var annotateCnt = 0;
        jsGraphAnnotate[ctx.canvas.id] = new Array();

        defMouse(ctx,data,config,"Doughnut");

        setRect(ctx,config);
        msr = setMeasures(data, config, ctx, height, width, null, true, false, false, false);

        calculateDrawingSize();

        var cutoutRadius = doughnutRadius * (config.percentageInnerCutout / 100);

        for (var i = 0; i < data.length; i++) {
            if (!(typeof(data[i].value)=='undefined'))segmentTotal += 1*data[i].value;
        }


        animationLoop(config, null, drawPieSegments, ctx, msr.clrx, msr.clry, msr.clrwidth, msr.clrheight, midPieX, midPieY, midPieX - doughnutRadius, midPieY + doughnutRadius, data);

        function drawPieSegments(animationDecimal) {
            var cumulativeAngle = -config.startAngle * (Math.PI / 180)+2*Math.PI ,
               cumvalue = 0,
			         scaleAnimation = 1,
			         rotateAnimation = 1;
 
            while (cumulativeAngle < 0){cumulativeAngle+=2*Math.PI;}
            while (cumulativeAngle > 2*Math.PI){cumulativeAngle-=2*Math.PI;}

          if (config.animation) {
                if (config.animateScale) {
                    scaleAnimation = animationDecimal;
                }
                if (config.animateRotate) {
                    rotateAnimation = animationDecimal;
                }
            }

            if (animationDecimal >= 1) {
                totvalue = 0;
                for (var i = 0; i < data.length; i++) if (!(typeof(data[i].value)=='undefined'))totvalue += 1*data[i].value;
            }

            for (var i = 0; i < data.length; i++) {
              if (!(typeof(data[i].value)=='undefined')){    
                var segmentAngle = rotateAnimation * ((1*data[i].value / segmentTotal) * (Math.PI * 2));
                if(segmentAngle >= Math.PI*2)segmentAngle=Math.PI*2-0.001;  // but on Android when segmentAngle is >= 2*PI;
                ctx.beginPath();
                ctx.arc(midPieX, midPieY, scaleAnimation * doughnutRadius, cumulativeAngle, cumulativeAngle + segmentAngle, false);
                ctx.arc(midPieX, midPieY, scaleAnimation * cutoutRadius, cumulativeAngle + segmentAngle, cumulativeAngle, true);
                ctx.closePath();
                ctx.fillStyle = data[i].color;
                ctx.fill();

                cumulativeAngle += segmentAngle;
                cumvalue += 1*data[i].value;

                if (config.segmentShowStroke) {
                    ctx.lineWidth = config.segmentStrokeWidth;
                    ctx.strokeStyle = config.segmentStrokeColor;
                    ctx.stroke();
                }

                if (animationDecimal >= 1) {
                    if (typeof (data[i].title) == "string") lgtxt = data[i].title.trim();
                    else lgtxt = "";

                    jsGraphAnnotate[ctx.canvas.id][annotateCnt++] = ["ARC", midPieX, midPieY, cutoutRadius, doughnutRadius, cumulativeAngle - segmentAngle, cumulativeAngle, lgtxt, 1*data[i].value, cumvalue, totvalue, segmentAngle, i];
                    if (config.inGraphDataShow) {
                    
                         if(config.inGraphDataAnglePosition==1)posAngle=realCumulativeAngle+config.inGraphDataPaddingAngle*(Math.PI/180);
                         else if(config.inGraphDataAnglePosition==2)posAngle=realCumulativeAngle-segmentAngle/2+config.inGraphDataPaddingAngle*(Math.PI/180);
                         else if(config.inGraphDataAnglePosition==3)posAngle=realCumulativeAngle-segmentAngle+config.inGraphDataPaddingAngle*(Math.PI/180);

                         if(config.inGraphDataRadiusPosition==1)labelRadius=cutoutRadius+config.inGraphDataPaddingRadius;
                         else if(config.inGraphDataRadiusPosition==2)labelRadius=cutoutRadius+(doughnutRadius-cutoutRadius)/2+config.inGraphDataPaddingRadius;
                         else if(config.inGraphDataRadiusPosition==3)labelRadius=doughnutRadius+config.inGraphDataPaddingRadius;

                         realCumulativeAngle -= segmentAngle;

                         
  				        	     ctx.save();
                         
                        if(config.inGraphDataAlign=="off-center"){
                           if(config.inGraphDataRotate=="inRadiusAxis" || (posAngle+2*Math.PI)%(2*Math.PI) > 3*Math.PI/2 || (posAngle+2*Math.PI)%(2*Math.PI) < Math.PI/2)ctx.textAlign = "left";
                           else ctx.textAlign="right";
                         }
                         else if(config.inGraphDataAlign=="to-center"){
                           if(config.inGraphDataRotate=="inRadiusAxis" || (posAngle+2*Math.PI)%(2*Math.PI) > 3*Math.PI/2 || (posAngle+2*Math.PI)%(2*Math.PI) < Math.PI/2)ctx.textAlign = "right";
                           else ctx.textAlign="left";
                         }
   					             else ctx.textAlign = config.inGraphDataAlign;  
                         if(config.inGraphDataVAlign=="off-center"){
                            if((posAngle+2*Math.PI)%(2*Math.PI)>Math.PI)ctx.textBaseline = "top";
                            else ctx.textBaseline = "bottom";
                         }
                         else if(config.inGraphDataVAlign=="to-center"){
                            if((posAngle+2*Math.PI)%(2*Math.PI)>Math.PI)ctx.textBaseline = "bottom";
                            else ctx.textBaseline = "top";
                         }
                         else ctx.textBaseline = config.inGraphDataVAlign;

           				       ctx.font = config.inGraphDataFontStyle + ' ' + config.inGraphDataFontSize + 'px ' + config.inGraphDataFontFamily;
	    		               ctx.fillStyle = config.inGraphDataFontColor;

                         var dispString = tmplbis(config.inGraphDataTmpl, { config:config, v1 : fmtChartJS(config,lgtxt,config.fmtV1), v2 : fmtChartJS(config,1*data[i].value,config.fmtV2), v3 : fmtChartJS(config,cumvalue,config.fmtV3), v4 : fmtChartJS(config,totvalue,config.fmtV4), v5 : fmtChartJS(config,segmentAngle,config.fmtV5), v6 : roundToWithThousands(config, fmtChartJS(config,100 * data[i].value / totvalue,config.fmtV6), config.roundPct), v7 : fmtChartJS(config,midPieX,config.fmtV7),v8 : fmtChartJS(config,midPieY,config.fmtV8),v9 : fmtChartJS(config,cutoutRadius,config.fmtV9),v10 : fmtChartJS(config,doughnutRadius,config.fmtV10),v11 : fmtChartJS(config,cumulativeAngle-segmentAngle,config.fmtV11),v12 : fmtChartJS(config,cumulativeAngle,config.fmtV12),v13 : fmtChartJS(config,i,config.fmtV13)});
                         ctx.translate(midPieX + labelRadius*Math.cos(posAngle), midPieY - labelRadius*Math.sin(posAngle));

                         if(config.inGraphDataRotate=="inRadiusAxis")ctx.rotate(2*Math.PI-posAngle);
                         else if(config.inGraphDataRotate=="inRadiusAxisRotateLabels")
                         {
                          if ((posAngle+2*Math.PI)%(2*Math.PI)>Math.PI/2 && (posAngle+2*Math.PI)%(2*Math.PI)<3*Math.PI/2)ctx.rotate(3*Math.PI-posAngle);
                          else ctx.rotate(2*Math.PI-posAngle); 
                         }
                         else ctx.rotate(config.inGraphDataRotate * (Math.PI / 180));
  			     			       ctx.fillText(dispString, 0,0);
                         ctx.restore();
                    }


                }
              }
            }
        } ;

        function calculateDrawingSize() {

            var lgtxt;
            var cumulativeAngle = -config.startAngle * (Math.PI / 180)+2*Math.PI ,
               cumvalue = 0;
 
            while (cumulativeAngle < 0){cumulativeAngle+=2*Math.PI;}
            while (cumulativeAngle > 2*Math.PI){cumulativeAngle-=2*Math.PI;}
            
            midPieX = msr.leftNotUsableSize + (msr.availableWidth / 2);
            midPieY = msr.topNotUsableSize + (msr.availableHeight / 2);
            doughnutRadius = Min([msr.availableHeight / 2, msr.availableWidth / 2]) - 5;


            // Computerange Pie Radius

            ctx.font = config.pointLabelFontStyle + " " + config.pointLabelFontSize + "px " + config.pointLabelFontFamily;
            if(config.inGraphDataShow && config.inGraphDataRadiusPosition==3 && config.inGraphDataAlign=="off-center" && config.inGraphDataRotate==0) {
                doughnutRadius = Min([msr.availableHeight / 2, msr.availableWidth / 2]) - config.inGraphDataFontSize - config.inGraphDataPaddingRadius -5;
              
                var realCumulativeAngle=config.startAngle* (Math.PI / 180)+2*Math.PI;
 
                while (realCumulativeAngle < 0){realCumulativeAngle+=2*Math.PI;}
                while (realCumulativeAngle > 2*Math.PI){realCumulativeAngle-=2*Math.PI;}

                var totvalue = 0;
                for (var i = 0; i < data.length; i++) if (!(typeof(data[i].value)=='undefined'))totvalue += 1*data[i].value;

       			    ctx.font = config.inGraphDataFontStyle + ' ' + config.inGraphDataFontSize + 'px ' + config.inGraphDataFontFamily;
                var posAngle;
                var cumulativeAngle=0;
                for (var i = 0; i < data.length; i++) {
                  if (!(typeof(data[i].value)=='undefined')){
                  cumvalue += 1*data[i].value;
                  var segmentAngle = (1*data[i].value / segmentTotal) * (Math.PI * 2);
                  cumulativeAngle += segmentAngle;

                  if(config.inGraphDataAnglePosition==1)posAngle=realCumulativeAngle+config.inGraphDataPaddingAngle*(Math.PI/180);
                  else if(config.inGraphDataAnglePosition==2)posAngle=realCumulativeAngle-segmentAngle/2+config.inGraphDataPaddingAngle*(Math.PI/180);
                  else if(config.inGraphDataAnglePosition==3)posAngle=realCumulativeAngle-segmentAngle+config.inGraphDataPaddingAngle*(Math.PI/180);
                  realCumulativeAngle -= segmentAngle;

                  if (typeof (data[i].title) == "string") lgtxt = data[i].title.trim();
                  else lgtxt = "";
                  var dispString = tmplbis(config.inGraphDataTmpl, { config:config, v1 : fmtChartJS(config,lgtxt,config.fmtV1), v2 : fmtChartJS(config,1*data[i].value,config.fmtV2), v3 : fmtChartJS(config,cumvalue,config.fmtV3), v4 : fmtChartJS(config,totvalue,config.fmtV4), v5 : fmtChartJS(config,segmentAngle,config.fmtV5), v6 : roundToWithThousands(config, fmtChartJS(config,100 * data[i].value / totvalue,config.fmtV6), config.roundPct), v7 : fmtChartJS(config,midPieX,config.fmtV7),v8 : fmtChartJS(config,midPieY,config.fmtV8),v9 : fmtChartJS(config,cutoutRadius,config.fmtV9),v10 : fmtChartJS(config,doughnutRadius,config.fmtV10),v11 : fmtChartJS(config,cumulativeAngle-segmentAngle,config.fmtV11),v12 : fmtChartJS(config,cumulativeAngle,config.fmtV12),v13 : fmtChartJS(config,i,config.fmtV13)});
                  var textMeasurement = ctx.measureText(dispString).width;
                
                  var MaxRadiusX=  Math.abs((msr.availableWidth / 2 - textMeasurement)/Math.cos(posAngle))-config.inGraphDataPaddingRadius - 5;
                  if(MaxRadiusX<doughnutRadius)doughnutRadius=MaxRadiusX;
                  }
                }

            }
            doughnutRadius=doughnutRadius*config.radiusScale;


        };


    } ;

    var Line = function (data, config, ctx) {
  
        var maxSize, scaleHop, calculatedScale, labelHeight, scaleHeight, valueBounds, labelTemplateString, valueHop, widestXLabel, xAxisLength, yAxisPosX, xAxisPosY, rotateLabels = 0, msr;
        var annotateCnt = 0;

        if (!dynamicFunction(data,config,ctx,"Line"))return;

        jsGraphAnnotate[ctx.canvas.id] = new Array();

        defMouse(ctx,data,config,"Line");

        setRect(ctx,config);
        valueBounds = getValueBounds();

        // true or fuzzy (error for negativ values (included 0))
        if (config.logarithmic !== false) {
            if (valueBounds.minValue <= 0) {
                config.logarithmic = false;
            }
        }

        // Check if logarithmic is meanigful
        var OrderOfMagnitude = calculateOrderOfMagnitude(Math.pow(10, calculateOrderOfMagnitude(valueBounds.maxValue) + 1)) - calculateOrderOfMagnitude(Math.pow(10, calculateOrderOfMagnitude(valueBounds.minValue)));
        if ((config.logarithmic == 'fuzzy' && OrderOfMagnitude < 4) || config.scaleOverride) {
            config.logarithmic = false;
        }

        //Check and set the scale
        labelTemplateString = (config.scaleShowLabels) ? config.scaleLabel : "";

        if (!config.scaleOverride) {
            calculatedScale = calculateScale(config, valueBounds.maxDailySteps, valueBounds.minSteps, valueBounds.maxValue, valueBounds.minValue, labelTemplateString);
            msr = setMeasures(data, config, ctx, height, width, calculatedScale.labels, false, false, true, true);
        }
        else {
            calculatedScale = {
                steps: config.scaleSteps,
                stepValue: config.scaleStepWidth,
                graphMin: config.scaleStartValue,
                graphMax: config.scaleStartValue+config.scaleSteps*config.scaleStepWidth,
                labels: []
            }
            populateLabels(config, labelTemplateString, calculatedScale.labels, calculatedScale.steps, config.scaleStartValue, calculatedScale.graphMax, config.scaleStepWidth);
            msr = setMeasures(data, config, ctx, height, width, calculatedScale.labels, false, false, true, true);
        }

        msr.availableHeight = msr.availableHeight - config.scaleTickSizeBottom - config.scaleTickSizeTop;
        msr.availableWidth = msr.availableWidth - config.scaleTickSizeLeft - config.scaleTickSizeRight;

        scaleHop = Math.floor(msr.availableHeight / calculatedScale.steps);
        valueHop = Math.floor(msr.availableWidth / (data.labels.length - 1));
        if(valueHop ==0)valueHop = (msr.availableWidth / (data.labels.length - 1));

        msr.clrwidth=msr.clrwidth-(msr.availableWidth-(data.labels.length - 1) * valueHop);
        msr.availableWidth = (data.labels.length - 1) * valueHop;
        msr.availableHeight = (calculatedScale.steps) * scaleHop;

        yAxisPosX = msr.leftNotUsableSize + config.scaleTickSizeLeft;
        xAxisPosY = msr.topNotUsableSize + msr.availableHeight + config.scaleTickSizeTop;

        drawLabels();
        var zeroY = 0;
        if (valueBounds.minValue < 0) {
            var zeroY = calculateOffset(config, 0, calculatedScale, scaleHop);
        }


        animationLoop(config, drawScale, drawLines, ctx, msr.clrx, msr.clry, msr.clrwidth, msr.clrheight, yAxisPosX + msr.availableWidth / 2, xAxisPosY - msr.availableHeight / 2, yAxisPosX, xAxisPosY, data);
        
        function drawLines(animPc) {
        
            var totvalue = new Array();
            var maxvalue = new Array();

            for (var i = 0; i < data.datasets.length; i++) { for (var j = 0; j < data.datasets[i].data.length; j++) { totvalue[j] = 0; maxvalue[j] = -999999999; } }
            for (var i = 0; i < data.datasets.length; i++) { for (var j = 0; j < data.datasets[i].data.length; j++) { totvalue[j] += data.datasets[i].data[j]; maxvalue[j] = Max([maxvalue[j], data.datasets[i].data[j]]); } }

            for (var i = 0; i < data.datasets.length; i++) {
            
                var prevpt=-1;
                var frstpt=-1;
                
                if (animPc >= 1) {
                    if (typeof (data.datasets[i].title) == "string") lgtxt = data.datasets[i].title.trim();
                    else lgtxt = "";
                }

                ctx.strokeStyle = data.datasets[i].strokeColor;
                ctx.lineWidth = config.datasetStrokeWidth;
                ctx.beginPath();

                for (var j = 0; j < data.datasets[i].data.length; j++) {
                    if (!(typeof(data.datasets[i].data[j])=='undefined')) { 

                      if (prevpt==-1){
                         ctx.moveTo(xPos(j), yPos(i, j));
                         frstpt=j;
                      } else {
                        if (config.bezierCurve) {
                          ctx.bezierCurveTo(xPos(j-(j-prevpt)/2), yPos(i, prevpt), xPos(j-(j-prevpt)/2), yPos(i, j), xPos(j), yPos(i, j));
                        }
                        else {
                          ctx.lineTo(xPos(j), yPos(i, j));
                        }
                      }
                      prevpt=j;
                      if (animPc >= 1) {
                        if (i == 0) divprev = data.datasets[i].data[j];
                        else divprev = data.datasets[i].data[j] - data.datasets[i - 1].data[j];
                        if (i == data.datasets.length - 1) divnext = data.datasets[i].data[j];
                        else divnext = data.datasets[i].data[j] - data.datasets[i + 1].data[j];

                        if (typeof (data.labels[j]) == "string") lgtxt2 = data.labels[j].trim();
                        else lgtxt2 = "";
                        jsGraphAnnotate[ctx.canvas.id][annotateCnt++] = ["POINT", xPos(j), yPos(i, j), lgtxt, lgtxt2, 1*data.datasets[i].data[j], divprev, divnext, maxvalue[j], totvalue[j], i, j];
        		    				if (config.inGraphDataShow) {
  				          			ctx.save();
   					          	  ctx.textAlign = config.inGraphDataAlign;
                          ctx.textBaseline = config.inGraphDataVAlign;
           							  ctx.font = config.inGraphDataFontStyle + ' ' + config.inGraphDataFontSize + 'px ' + config.inGraphDataFontFamily;
	    		        			  ctx.fillStyle = config.inGraphDataFontColor;
	         			    			var dotX = yAxisPosX + (valueHop *k),
					       	    	    dotY = xAxisPosY - animPc*(calculateOffset(config, data.datasets[i].data[j],calculatedScale,scaleHop)),
    						       	    paddingTextX = config.inGraphDataPaddingX,
		    				      	    paddingTextY = config.inGraphDataPaddingY;
                          var dispString = tmplbis(config.inGraphDataTmpl, { config:config, v1 : fmtChartJS(config,lgtxt,config.fmtV1), v2 : fmtChartJS(config,lgtxt2,config.fmtV2), v3 : fmtChartJS(config,1*data.datasets[i].data[j],config.fmtV3), v4 : fmtChartJS(config,divprev,config.fmtV4), v5 : fmtChartJS(config,divnext,config.fmtV5), v6 : fmtChartJS(config,maxvalue[j],config.fmtV6), v7 : fmtChartJS(config,totvalue[j],config.fmtV7), v8 : roundToWithThousands(config,fmtChartJS(config,100 * data.datasets[i].data[j] / totvalue[j],config.fmtV8),config.roundPct),v9 : fmtChartJS(config,yAxisPosX,config.fmtV9),v10 : fmtChartJS(config,xAxisPosY - (calculateOffset(config, data.datasets[i].data[j], calculatedScale, scaleHop)),config.fmtV10),v11 : fmtChartJS(config,i,config.fmtV11), v12 : fmtChartJS(config,j,config.fmtV12)});
                          ctx.translate(xPos(j) + paddingTextX, yPos(i,j) - paddingTextY);
                          ctx.rotate(config.inGraphDataRotate * (Math.PI / 180));
  			     			        ctx.fillText(dispString, 0,0);
                          ctx.restore();
                        }
                      }
                    }
                }
                ctx.stroke();
                if (config.datasetFill) {
                    ctx.lineTo(yAxisPosX + (valueHop * (data.datasets[i].data.length - 1)), xAxisPosY - zeroY);
                    ctx.lineTo(xPos(frstpt), xAxisPosY - zeroY);
                    ctx.lineTo(xPos(frstpt), yPos(i, frstpt));
                    ctx.closePath();
                    ctx.fillStyle = data.datasets[i].fillColor;
                    ctx.fill();
                    
                }
                else {
                    ctx.closePath();
                }
                if (config.pointDot) {
                    ctx.fillStyle = data.datasets[i].pointColor;
                    ctx.strokeStyle = data.datasets[i].pointStrokeColor;
                    ctx.lineWidth = config.pointDotStrokeWidth;
                    for (var k = 0; k < data.datasets[i].data.length; k++) {
                        if (!(typeof(data.datasets[i].data[k])=='undefined')) { 
                          ctx.beginPath();
                          ctx.arc(yAxisPosX + (valueHop * k), xAxisPosY - animPc * (calculateOffset(config, data.datasets[i].data[k], calculatedScale, scaleHop)), config.pointDotRadius, 0, Math.PI * 2, true);
                          ctx.fill();
                          ctx.stroke();
                        }
                    }
                }
            };

            function yPos(dataSet, iteration) {
                return xAxisPosY - animPc * (calculateOffset(config, data.datasets[dataSet].data[iteration], calculatedScale, scaleHop));
            };
            function xPos(iteration) {
                return yAxisPosX + (valueHop * iteration);
            };


        } ;

        function drawScale() {

            //X axis line                                                          

            ctx.lineWidth = config.scaleLineWidth;
            ctx.strokeStyle = config.scaleLineColor;
            ctx.beginPath();
            ctx.moveTo(yAxisPosX - config.scaleTickSizeLeft, xAxisPosY);
            ctx.lineTo(yAxisPosX + msr.availableWidth + config.scaleTickSizeRight, xAxisPosY);

            ctx.stroke();

            for (var i = 0; i < data.labels.length; i++) {
                ctx.beginPath();
                ctx.moveTo(yAxisPosX + i * valueHop, xAxisPosY + config.scaleTickSizeBottom);
                ctx.lineWidth = config.scaleGridLineWidth;
                ctx.strokeStyle = config.scaleGridLineColor;

                //Check i isnt 0, so we dont go over the Y axis twice.

                if (config.scaleShowGridLines && i > 0 && i % config.scaleXGridLinesStep==0 ) {
                    ctx.lineTo(yAxisPosX + i * valueHop, xAxisPosY - msr.availableHeight - config.scaleTickSizeTop);
                }
                else {
                    ctx.lineTo(yAxisPosX + i * valueHop, xAxisPosY);
                }
                ctx.stroke();
            }

            //Y axis

            ctx.lineWidth = config.scaleLineWidth;
            ctx.strokeStyle = config.scaleLineColor;
            ctx.beginPath();
            ctx.moveTo(yAxisPosX, xAxisPosY + config.scaleTickSizeBottom);
            ctx.lineTo(yAxisPosX, xAxisPosY - msr.availableHeight - config.scaleTickSizeTop);
            ctx.stroke();

            for (var j = 0 ; j < calculatedScale.steps; j++) {
               ctx.beginPath();
               ctx.moveTo(yAxisPosX - config.scaleTickSizeLeft, xAxisPosY - ((j + 1) * scaleHop));
               ctx.lineWidth = config.scaleGridLineWidth;
               ctx.strokeStyle = config.scaleGridLineColor;
               if (config.scaleShowGridLines && j % config.scaleYGridLinesStep==0 ) {
                   ctx.lineTo(yAxisPosX + msr.availableWidth + config.scaleTickSizeRight, xAxisPosY - ((j + 1) * scaleHop));
               }
               else {
                   ctx.lineTo(yAxisPosX, xAxisPosY - ((j + 1) * scaleHop));
               }
               ctx.stroke();
            }
        } ;

        function drawLabels() {
            ctx.font = config.scaleFontStyle + " " + config.scaleFontSize + "px " + config.scaleFontFamily;

            //X Labels     
            if(config.xAxisTop || config.xAxisBottom) {                                                    
              ctx.textBaseline = "top";
              if (msr.rotateLabels > 90) {
                  ctx.save();
                  ctx.textAlign = "left";
              }
              else if (msr.rotateLabels > 0) {
                  ctx.save();
                  ctx.textAlign = "right";
              }
              else {
                  ctx.textAlign = "center";
            
              }
              ctx.fillStyle = config.scaleFontColor;

              if(config.xAxisBottom){
                for (var i = 0; i < data.labels.length; i++) {
                  ctx.save();
                  if (msr.rotateLabels > 0) {
                    ctx.translate(yAxisPosX + i * valueHop - config.scaleFontSize/2, msr.xLabelPos);
                    ctx.rotate(-(msr.rotateLabels * (Math.PI / 180)));
                    ctx.fillText(fmtChartJS(config,data.labels[i],config.fmtXLabel), 0, 0);
                  }
                  else {
                    ctx.fillText(fmtChartJS(config,data.labels[i],config.fmtXLabel), yAxisPosX + i * valueHop, msr.xLabelPos);
                  }
                ctx.restore();
                }
              }
            }

            //Y Labels

            ctx.textAlign = "right";
            ctx.textBaseline = "middle";

            for (var j = ((config.showYAxisMin) ? -1 : 0) ; j < calculatedScale.steps; j++) {
                if (config.scaleShowLabels) {
                    if (config.yAxisLeft) {
                        ctx.textAlign = "right";
                        ctx.fillText(calculatedScale.labels[j + 1], yAxisPosX - (config.scaleTickSizeLeft + 3), xAxisPosY - ((j + 1) * scaleHop));
                    }
                    if (config.yAxisRight) {
                        ctx.textAlign = "left";
                        ctx.fillText(calculatedScale.labels[j + 1], yAxisPosX + msr.availableWidth + (config.scaleTickSizeRight + 3), xAxisPosY - ((j + 1) * scaleHop));
                    }
                }
            }
        } ;

        function getValueBounds() {
            var upperValue = Number.MIN_VALUE;
            var lowerValue = Number.MAX_VALUE;
            for (var i = 0; i < data.datasets.length; i++) {
                for (var j = 0; j < data.datasets[i].data.length; j++) {
                    if (1*data.datasets[i].data[j] > upperValue) { upperValue = 1*data.datasets[i].data[j] };
                    if (1*data.datasets[i].data[j] < lowerValue) { lowerValue = 1*data.datasets[i].data[j] };
                }
            };

			if (Math.abs(upperValue - lowerValue)<0.00000001) {
				upperValue = Max([upperValue*2,1]);
				lowerValue = 0;
			}

            // AJOUT CHANGEMENT
            if (!isNaN(config.graphMin)) lowerValue = config.graphMin;
            if (!isNaN(config.graphMax)) upperValue = config.graphMax;

            var maxSteps = Math.floor((scaleHeight / (labelHeight * 0.66)));
            var minSteps = Math.floor((scaleHeight / labelHeight * 0.5));

            return {
                maxValue: upperValue,
                minValue: lowerValue,
                maxDailySteps: maxSteps,
                minSteps: minSteps
            };
        };
    } ;

    var StackedBar = function (data, config, ctx) {
    
        var maxSize, scaleHop, calculatedScale, labelHeight, scaleHeight, valueBounds, labelTemplateString, valueHop, widestXLabel, xAxisLength, yAxisPosX, xAxisPosY, barWidth, rotateLabels = 0, msr;

        if (!dynamicFunction(data,config,ctx,"StackedBar"))return;

        config.logarithmic = false;

        var annotateCnt = 0;
        jsGraphAnnotate[ctx.canvas.id] = new Array();

        defMouse(ctx,data,config,"StackedBar");

        setRect(ctx,config);

        valueBounds = getValueBounds();
        //Check and set the scale
        labelTemplateString = (config.scaleShowLabels) ? config.scaleLabel : "";
        if (!config.scaleOverride) {
            calculatedScale = calculateScale(config, valueBounds.maxDailySteps, valueBounds.minSteps, valueBounds.maxValue, valueBounds.minValue, labelTemplateString);
            msr = setMeasures(data, config, ctx, height, width, calculatedScale.labels, true, false, true, true);
        }
        else {
            calculatedScale = {
                steps: config.scaleSteps,
                stepValue: config.scaleStepWidth,
                graphMin: config.scaleStartValue,
                labels: []
            }
            for (var i = 0; i < calculatedScale.steps; i++) {
                if (labelTemplateString) {
                    calculatedScale.labels.push(tmpl(labelTemplateString, { value: fmtChartJS(config,1 * ((config.scaleStartValue + (config.scaleStepWidth * (i + 1))).toFixed(getDecimalPlaces(config.scaleStepWidth))),config.fmtYLabel) }));
                }
            }
            msr = setMeasures(data, config, ctx, height, width, calculatedScale.labels, true, false, true, true);
        }

        msr.availableHeight = msr.availableHeight - config.scaleTickSizeBottom - config.scaleTickSizeTop;
        msr.availableWidth = msr.availableWidth - config.scaleTickSizeLeft - config.scaleTickSizeRight;

        scaleHop = Math.floor(msr.availableHeight / calculatedScale.steps);
        valueHop = Math.floor(msr.availableWidth / (data.labels.length));
        if(valueHop ==0)valueHop = (msr.availableWidth / (data.labels.length - 1));

        msr.clrwidth=msr.clrwidth - (msr.availableWidth - ((data.labels.length) * valueHop));
        msr.availableWidth = (data.labels.length) * valueHop;
        msr.availableHeight = (calculatedScale.steps) * scaleHop;

        yAxisPosX = msr.leftNotUsableSize + config.scaleTickSizeLeft;
        xAxisPosY = msr.topNotUsableSize + msr.availableHeight + config.scaleTickSizeTop;

        barWidth = (valueHop - config.scaleGridLineWidth * 2 - (config.barValueSpacing * 2) - (config.barDatasetSpacing * data.datasets.length - 1) - (config.barStrokeWidth / 2) - 1);

        drawLabels();
        animationLoop(config, drawScale, drawBars, ctx, msr.clrx, msr.clry, msr.clrwidth, msr.clrheight, yAxisPosX + msr.availableWidth / 2, xAxisPosY - msr.availableHeight / 2, yAxisPosX, xAxisPosY, data);

        function drawBars(animPc) {
            ctx.lineWidth = config.barStrokeWidth;
            var yStart = new Array(data.datasets.length);
            var yFpt = new Array(data.datasets.length);

            var cumvalue = new Array();
            var totvalue = new Array();
            for (var i = 0; i < data.datasets.length; i++) { for (var j = 0; j < data.datasets[i].data.length; j++) { cumvalue[j] = 0; totvalue[j] = 0; } }
            for (var i = 0; i < data.datasets.length; i++) { for (var j = 0; j < data.datasets[i].data.length; j++) if (!(typeof(data.datasets[i].data[j])=='undefined')) { totvalue[j] += 1*data.datasets[i].data[j]; } }

            for (var i = 0; i < data.datasets.length; i++) {
                ctx.fillStyle = data.datasets[i].fillColor;
                ctx.strokeStyle = data.datasets[i].strokeColor;
                if (animPc >= 1) {
                    if (typeof (data.datasets[i].title) == "string") lgtxt = data.datasets[i].title.trim();
                    else lgtxt = "";
                }

                 for (var j = 0; j < data.datasets[i].data.length; j++) {
                     if(i==0) {yStart[j]=0;yFpt[j]=-1;}
                     if (!(typeof(data.datasets[i].data[j])=='undefined')) {
                        var barOffset = yAxisPosX + config.barValueSpacing + valueHop * j;
                        ctx.beginPath();
                        ctx.moveTo(barOffset, xAxisPosY - yStart[j] + 1);
                        ctx.lineTo(barOffset, xAxisPosY - animPc * calculateOffset(config, (yFpt[j]>=0)*calculatedScale.graphMin + 1*data.datasets[i].data[j], calculatedScale, scaleHop) + (config.barStrokeWidth / 2) - yStart[j]);
                        ctx.lineTo(barOffset + barWidth, xAxisPosY - animPc * calculateOffset(config, (yFpt[j]>=0)*calculatedScale.graphMin + 1*data.datasets[i].data[j], calculatedScale, scaleHop) + (config.barStrokeWidth / 2) - yStart[j]);
                        ctx.lineTo(barOffset + barWidth, xAxisPosY - yStart[j] + 1);
                        if (config.barShowStroke) ctx.stroke();
                        ctx.closePath();
                        ctx.fill();
                        cumvalue[j] += 1*data.datasets[i].data[j];
                        if (animPc >= 1) {
                         if (typeof (data.labels[j]) == "string") lgtxt2 = data.labels[j].trim();
                         else lgtxt2 = "";
                         jsGraphAnnotate[ctx.canvas.id][annotateCnt++] = ["RECT", barOffset, xAxisPosY - yStart[j] + 1, barOffset + barWidth, xAxisPosY - calculateOffset(config, (yFpt[j]>=0)* calculatedScale.graphMin + 1*data.datasets[i].data[j], calculatedScale, scaleHop) + (config.barStrokeWidth / 2) - yStart[j], lgtxt, lgtxt2, 1*data.datasets[i].data[j], cumvalue[j], totvalue[j], i, j];
                        }
                        yStart[j] += animPc * calculateOffset(config, (yFpt[j]>=0)*calculatedScale.graphMin + 1*data.datasets[i].data[j], calculatedScale, scaleHop) - (config.barStrokeWidth / 2);
                        if (yFpt[j]==-1)yFpt[j]=i;
                     }
                }
            }
            
        if(animPc >=1 && config.inGraphDataShow) {

            var yPos =0, xPos=0;
            for (var i = 0; i < data.datasets.length; i++) { for (var j = 0; j < data.datasets[i].data.length; j++) { cumvalue[j] = 0; } }

            for (var i = 0; i < data.datasets.length; i++) {
                if (typeof (data.datasets[i].title) == "string") lgtxt = data.datasets[i].title.trim();
                else lgtxt = "";
                for (var j = 0; j < data.datasets[i].data.length; j++) {
                    if(i==0) {yStart[j]=0;yFpt[j]=-1;}
                    if (!(typeof(data.datasets[i].data[j])=='undefined')) {
                   			ctx.save();
             	          ctx.textAlign = config.inGraphDataAlign;
                        ctx.textBaseline = config.inGraphDataVAlign;
				                ctx.font = config.inGraphDataFontStyle + ' ' + config.inGraphDataFontSize + 'px ' + config.inGraphDataFontFamily;
   			                ctx.fillStyle = config.inGraphDataFontColor;

                        if (typeof (data.labels[j]) == "string") lgtxt2 = data.labels[j].trim();
                        else lgtxt2 = "";

                        var dispString = tmplbis(config.inGraphDataTmpl, { config:config, v1 : fmtChartJS(config,lgtxt,config.fmtV1), v2 : fmtChartJS(config,lgtxt2,config.fmtV2), v3 : fmtChartJS(config,1*data.datasets[i].data[j],config.fmtV3), v4 : fmtChartJS(config,cumvalue[j],config.fmtV4), v5 : fmtChartJS(config,totvalue[j],config.fmtV5), v6 : roundToWithThousands(config,fmtChartJS(config,100 * data.datasets[i].data[j] / totvalue[j],config.fmtV6),config.roundPct),v7 : fmtChartJS(config,barOffset,config.fmtV7),v8 : fmtChartJS(config,xAxisPosY,config.fmtV8),v9 : fmtChartJS(config,barOffset + barWidth,config.fmtV9),v10 : fmtChartJS(config,xAxisPosY - calculateOffset(config, data.datasets[i].data[j], calculatedScale, scaleHop) + (config.barStrokeWidth / 2),config.fmtV10),v11 : fmtChartJS(config,i,config.fmtV11), v12 : fmtChartJS(config,j,config.fmtV12)});
 
                        var barOffset = yAxisPosX + config.barValueSpacing + valueHop * j;
                        ctx.beginPath();

                        ctx.beginPath();
                        yPos =0;
                        xPos=0;

                        if(config.inGraphDataXPosition==1) { xPos=barOffset+config.inGraphDataPaddingX; } 
                        else if(config.inGraphDataXPosition==2) { xPos=barOffset+barWidth/2+config.inGraphDataPaddingX ;}
                        else if(config.inGraphDataXPosition==3) { xPos=barOffset+barWidth+config.inGraphDataPaddingX;} 
                        if(config.inGraphDataYPosition==1) { yPos=xAxisPosY - yStart[j] - config.inGraphDataPaddingY; }
                        else if(config.inGraphDataYPosition==2) { yPos=xAxisPosY -(calculateOffset(config, (yFpt[j]>=0)*calculatedScale.graphMin +1*data.datasets[i].data[j], calculatedScale, scaleHop) + (config.barStrokeWidth / 2) )/2 - yStart[j] - config.inGraphDataPaddingY; }
                        else if(config.inGraphDataYPosition==3) { yPos=xAxisPosY -calculateOffset(config, (yFpt[j]>=0)*calculatedScale.graphMin + 1*data.datasets[i].data[j], calculatedScale, scaleHop) + (config.barStrokeWidth / 2)  - yStart[j] - config.inGraphDataPaddingY; }

                        ctx.translate(xPos,yPos);

                        ctx.rotate(config.inGraphDataRotate * (Math.PI / 180));
   	    		            ctx.fillText(dispString, 0,0);
    			    	        ctx.restore();

                        cumvalue[j] += 1+data.datasets[i].data[j];
                        yStart[j] += animPc * calculateOffset(config, (yFpt[j]>=0)*calculatedScale.graphMin + 1*data.datasets[i].data[j], calculatedScale, scaleHop) - (config.barStrokeWidth / 2);
                        if (yFpt[j]==-1)yFpt[j]=i;
                    }
                }
              }
            }
        } ;

        function drawScale() {

            //X axis line                                                          

            ctx.lineWidth = config.scaleLineWidth;
            ctx.strokeStyle = config.scaleLineColor;
            ctx.beginPath();
            ctx.moveTo(yAxisPosX - config.scaleTickSizeLeft, xAxisPosY);
            ctx.lineTo(yAxisPosX + msr.availableWidth + config.scaleTickSizeRight, xAxisPosY);
            ctx.stroke();

            for (var i = 0; i < data.labels.length; i++) {
                ctx.beginPath();
                ctx.moveTo(yAxisPosX + i * valueHop, xAxisPosY + config.scaleTickSizeBottom);
                ctx.lineWidth = config.scaleGridLineWidth;
                ctx.strokeStyle = config.scaleGridLineColor;

                //Check i isnt 0, so we dont go over the Y axis twice.
                if (config.scaleShowGridLines && i>0 && i % config.scaleXGridLinesStep==0 ) {
                    ctx.lineTo(yAxisPosX + i * valueHop, xAxisPosY - msr.availableHeight - config.scaleTickSizeTop);
                }
                else {
                    ctx.lineTo(yAxisPosX + i * valueHop, xAxisPosY);
                }
                ctx.stroke();
            }

            //Y axis

            ctx.lineWidth = config.scaleLineWidth;
            ctx.strokeStyle = config.scaleLineColor;
            ctx.beginPath();
            ctx.moveTo(yAxisPosX, xAxisPosY + config.scaleTickSizeBottom);
            ctx.lineTo(yAxisPosX, xAxisPosY - msr.availableHeight - config.scaleTickSizeTop);
            ctx.stroke();

            for (var j = ((config.showYAxisMin) ? -1 : 0) ; j < calculatedScale.steps; j++) {
               ctx.beginPath();
               ctx.moveTo(yAxisPosX - config.scaleTickSizeLeft, xAxisPosY - ((j + 1) * scaleHop));
               ctx.lineWidth = config.scaleGridLineWidth;
               ctx.strokeStyle = config.scaleGridLineColor;
               if (config.scaleShowGridLines && j % config.scaleYGridLinesStep==0 ) {
                   ctx.lineTo(yAxisPosX + msr.availableWidth + config.scaleTickSizeRight, xAxisPosY - ((j + 1) * scaleHop));
               }
               else {
                   ctx.lineTo(yAxisPosX, xAxisPosY - ((j + 1) * scaleHop));
               }
               ctx.stroke();
            }
        } ;

        function drawLabels() {
            ctx.font = config.scaleFontStyle + " " + config.scaleFontSize + "px " + config.scaleFontFamily;

            //X axis labels                                                          

            if(config.xAxisTop || config.xAxisBottom) {                                                    

              ctx.textBaseline = "top";
              if (msr.rotateLabels > 90) {
                  ctx.save();
                  ctx.textAlign = "left";
              }
              else if (msr.rotateLabels > 0) {
                  ctx.save();
                  ctx.textAlign = "right";
              }
              else {
                  ctx.textAlign = "center";
              }
              ctx.fillStyle = config.scaleFontColor;

              if(config.xAxisBottom){
                for (var i = 0; i < data.labels.length; i++) {
                    ctx.save();
                    if (msr.rotateLabels > 0) {
                        ctx.translate(yAxisPosX + i * valueHop + (barWidth / 2)- config.scaleFontSize/2, msr.xLabelPos);
                        ctx.rotate(-(msr.rotateLabels * (Math.PI / 180)));
                        ctx.fillText(fmtChartJS(config,data.labels[i],config.fmtXLabel), 0, 0);
                    }
                    else {
                        ctx.fillText(fmtChartJS(config,data.labels[i],config.fmtXLabel), yAxisPosX + i * valueHop + (barWidth / 2), msr.xLabelPos);
                    }
                    ctx.restore();
                }
              }
            }

            //Y axis

            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            for (var j = ((config.showYAxisMin) ? -1 : 0) ; j < calculatedScale.steps; j++) {
                if (config.scaleShowLabels) {
                    if (config.yAxisLeft) {
                        ctx.textAlign = "right";
                        ctx.fillText(calculatedScale.labels[j + 1], yAxisPosX - (config.scaleTickSizeLeft + 3), xAxisPosY - ((j + 1) * scaleHop));
                    }
                    if (config.yAxisRight) {
                        ctx.textAlign = "left";
                        ctx.fillText(calculatedScale.labels[j + 1], yAxisPosX + msr.availableWidth + (config.scaleTickSizeRight + 3), xAxisPosY - ((j + 1) * scaleHop));
                    }
                }
            }
        } ;

        function getValueBounds() {
            var upperValue = Number.MIN_VALUE;
            var lowerValue = Number.MAX_VALUE;

            var minvl = new Array(data.datasets.length);
            var maxvl = new Array(data.datasets.length);

            for (var i = 0; i < data.datasets.length; i++) {
                for (var j = 0; j < data.datasets[i].data.length; j++) {
                    var k = i;
                    var temp=0;
                    if (!(typeof(data.datasets[0].data[j])=='undefined')){
                      temp += 1*data.datasets[0].data[j];
                      if (temp > upperValue) { upperValue = temp; };
                      if (temp < lowerValue) { lowerValue = temp; };
                    }
                    while (k > 0) { //get max of stacked data
                        if (!(typeof(data.datasets[k].data[j])=='undefined')) {
                          temp += 1*data.datasets[k].data[j];
                          if (temp > upperValue) { upperValue = temp; };
                          if (temp < lowerValue) { lowerValue = temp; };
                        }
                        k--;
                    }
                }
            };


            // AJOUT CHANGEMENT
            if (!isNaN(config.graphMin)) lowerValue = config.graphMin;
            if (!isNaN(config.graphMax)) upperValue = config.graphMax;

      			if (Math.abs(upperValue - lowerValue)<0.00000001) {
			       	upperValue = Max([upperValue*2,1]);
				      lowerValue = 0;
			      }
            var maxSteps = Math.floor((scaleHeight / (labelHeight * 0.66)));
            var minSteps = Math.floor((scaleHeight / labelHeight * 0.5));

            return {
                maxValue: upperValue,
                minValue: lowerValue,
                maxDailySteps: maxSteps,
                minSteps: minSteps
            };
        } ;
    } ;

    var HorizontalStackedBar = function (data, config, ctx) {
        var maxSize, scaleHop, calculatedScale, labelHeight, scaleHeight, valueBounds, labelTemplateString, valueHop, widestXLabel, xAxisLength, yAxisPosX, xAxisPosY, barWidth, rotateLabels = 0, msr;

        if (!dynamicFunction(data,config,ctx,"HorizontalStackedBar"))return;

        config.logarithmic = false;

        var annotateCnt = 0;
        jsGraphAnnotate[ctx.canvas.id] = new Array();

        defMouse(ctx,data,config,"HorizontalStackedBar");

        setRect(ctx,config);
        valueBounds = getValueBounds();
        //Check and set the scale
        labelTemplateString = (config.scaleShowLabels) ? config.scaleLabel : "";

        if (!config.scaleOverride) {
            calculatedScale = calculateScale(config, valueBounds.maxDailySteps, valueBounds.minSteps, valueBounds.maxValue, valueBounds.minValue, labelTemplateString);
            msr = setMeasures(data, config, ctx, height, width, calculatedScale.labels, true, true, true, true);
        }
        else {
            calculatedScale = {
                steps: config.scaleSteps,
                stepValue: config.scaleStepWidth,
                graphMin: config.scaleStartValue,
                labels: []
            }

            for (var i = 0; i < calculatedScale.steps; i++) {
                if (labelTemplateString) {
                    calculatedScale.labels.push(tmpl(labelTemplateString, { value: fmtChartJS(config,1 * ((config.scaleStartValue + (config.scaleStepWidth * (i + 1))).toFixed(getDecimalPlaces(config.scaleStepWidth))),config.fmtYLabel) }));
                }
            }
            msr = setMeasures(data, config, ctx, height, width, calculatedScale.labels, true, true, true, true);
        }

        msr.availableHeight = msr.availableHeight - config.scaleTickSizeBottom - config.scaleTickSizeTop;
        msr.availableWidth = msr.availableWidth - config.scaleTickSizeLeft - config.scaleTickSizeRight;

        scaleHop = Math.floor(msr.availableHeight / data.labels.length);
        valueHop = Math.floor(msr.availableWidth / (calculatedScale.steps));
        if(valueHop ==0)valueHop = (msr.availableWidth / (data.labels.length - 1));

        msr.clrwidth=msr.clrwidth - (msr.availableWidth - (calculatedScale.steps * valueHop));
        msr.availableWidth = (calculatedScale.steps) * valueHop;
        msr.availableHeight = (data.labels.length) * scaleHop;

        yAxisPosX = msr.leftNotUsableSize + config.scaleTickSizeLeft;
        xAxisPosY = msr.topNotUsableSize + msr.availableHeight + config.scaleTickSizeTop;

        barWidth = (scaleHop - config.scaleGridLineWidth * 2 - (config.barValueSpacing * 2) - (config.barDatasetSpacing * data.datasets.length - 1) - (config.barStrokeWidth / 2) - 1);

        drawLabels();
        animationLoop(config, drawScale, drawBars, ctx, msr.clrx, msr.clry, msr.clrwidth, msr.clrheight, yAxisPosX + msr.availableWidth / 2, xAxisPosY - msr.availableHeight / 2, yAxisPosX, xAxisPosY, data);

        function HorizontalCalculateOffset(val, calculatedScale, scaleHop) {

            var outerValue = calculatedScale.steps * calculatedScale.stepValue;
            var adjustedValue = val - calculatedScale.graphMin;
            var scalingFactor = CapValue(adjustedValue / outerValue, 1, 0);

            return (scaleHop * calculatedScale.steps) * scalingFactor;
        } ;

        function drawBars(animPc) {
            ctx.lineWidth = config.barStrokeWidth;
            var yStart = new Array(data.datasets.length);
            var yFpt = new Array(data.datasets.length);

            var cumvalue = new Array();
            var totvalue = new Array();
            for (var i = 0; i < data.datasets.length; i++) { for (var j = 0; j < data.datasets[i].data.length; j++) { cumvalue[j] = 0; totvalue[j] = 0; } }
            for (var i = 0; i < data.datasets.length; i++) { for (var j = 0; j < data.datasets[i].data.length; j++) if (!(typeof(data.datasets[i].data[j])=='undefined')) { totvalue[j] += 1*data.datasets[i].data[j]; } }

            for (var i = 0; i < data.datasets.length; i++) {
                ctx.fillStyle = data.datasets[i].fillColor;
                ctx.strokeStyle = data.datasets[i].strokeColor;
                if (animPc >= 1) {
                    if (typeof (data.datasets[i].title) == "string") lgtxt = data.datasets[i].title.trim();
                    else lgtxt = "";
                }
                for (var j = 0; j < data.datasets[i].data.length; j++) {
                      if(i==0) {yStart[j]=0;yFpt[j]=-1;}
                      if (!(typeof(data.datasets[i].data[j])=='undefined')) {

                        var barOffset = xAxisPosY + config.barValueSpacing - scaleHop * (j + 1);
                        ctx.beginPath();
                        ctx.moveTo(yAxisPosX + yStart[j] + 1, barOffset);
                        ctx.lineTo(yAxisPosX + yStart[j] + animPc * HorizontalCalculateOffset((yFpt[j]>=0)*calculatedScale.graphMin + 1*data.datasets[i].data[j], calculatedScale, valueHop) + (config.barStrokeWidth / 2), barOffset);
                        ctx.lineTo(yAxisPosX + yStart[j] + animPc * HorizontalCalculateOffset((yFpt[j]>=0)*calculatedScale.graphMin + 1*data.datasets[i].data[j], calculatedScale, valueHop) + (config.barStrokeWidth / 2), barOffset + barWidth);
                        ctx.lineTo(yAxisPosX + yStart[j] + 1, barOffset + barWidth);
                        ctx.lineTo(yAxisPosX + yStart[j] + 1, barOffset);

                        if (config.barShowStroke) ctx.stroke();
                        ctx.closePath();
                        ctx.fill();

                        cumvalue[j] += 1*data.datasets[i].data[j];
                        if (animPc >= 1) {
                            if (typeof (data.labels[j]) == "string") lgtxt2 = data.labels[j].trim();
                            else lgtxt2 = "";
                            jsGraphAnnotate[ctx.canvas.id][annotateCnt++] = ["RECT", yAxisPosX + yStart[j] + 1, barOffset + barWidth, yAxisPosX + yStart[j] + HorizontalCalculateOffset((yFpt[j]>=0)*calculatedScale.graphMin + 1*data.datasets[i].data[j], calculatedScale, valueHop) + (config.barStrokeWidth / 2), barOffset, lgtxt, lgtxt2, 1*data.datasets[i].data[j], cumvalue[j], totvalue[j], i, j];
                        }
                        yStart[j] += animPc * HorizontalCalculateOffset((yFpt[j]>=0)*calculatedScale.graphMin + 1*data.datasets[i].data[j], calculatedScale, valueHop) + (config.barStrokeWidth / 2);
                        if (yFpt[j]==-1)yFpt[j]=i;
                     }
                }
            }
        if(animPc >=1 && config.inGraphDataShow) {

            var yPos =0, xPos=0;
            for (var i = 0; i < data.datasets.length; i++) { for (var j = 0; j < data.datasets[i].data.length; j++) { cumvalue[j] = 0; } }

            for (var i = 0; i < data.datasets.length; i++) {
                if (typeof (data.datasets[i].title) == "string") lgtxt = data.datasets[i].title.trim();
                else lgtxt = "";
                for (var j = 0; j < data.datasets[i].data.length; j++) {
                      if(i==0) {yStart[j]=0;yFpt[j]=-1;}                  			
                      if (!(typeof(data.datasets[i].data[j])=='undefined')) {
                        ctx.save();
                	      ctx.textAlign = config.inGraphDataAlign;
                        ctx.textBaseline = config.inGraphDataVAlign;
						            ctx.font = config.inGraphDataFontStyle + ' ' + config.inGraphDataFontSize + 'px ' + config.inGraphDataFontFamily;
       			            ctx.fillStyle = config.inGraphDataFontColor;

                        if (typeof (data.labels[j]) == "string") lgtxt2 = data.labels[j].trim();
                        else lgtxt2 = "";
                        var barOffset = xAxisPosY + config.barValueSpacing - scaleHop * (j + 1);
                        var dispString = tmplbis(config.inGraphDataTmpl, { config:config, v1 : fmtChartJS(config,lgtxt,config.fmtV1), v2 : fmtChartJS(config,lgtxt2,config.fmtV2), v3 : fmtChartJS(config,1*data.datasets[i].data[j],config.fmtV3), v4 : fmtChartJS(config,cumvalue[j],config.fmtV4), v5 : fmtChartJS(config,totvalue[j],config.fmtV5), v6 : roundToWithThousands(config,fmtChartJS(config,100 *  data.datasets[i].data[j] / totvalue[j],config.fmtV6),config.roundPct),v7 : fmtChartJS(config,yAxisPosX,config.fmtV7),v8 : fmtChartJS(config,barOffset + barWidth,config.fmtV8),v9 : fmtChartJS(config,yAxisPosX + HorizontalCalculateOffset(data.datasets[i].data[j], calculatedScale, valueHop) + (config.barStrokeWidth / 2),config.fmtV9),v10 : fmtChartJS(config,barOffset,config.fmtV10),v11 : fmtChartJS(config,i,config.fmtV11), v12 : fmtChartJS(config,j,config.fmtV12)});

                        ctx.beginPath();
                        yPos =0;
                        xPos=0;

                        if(config.inGraphDataXPosition==1) { xPos=yAxisPosX + yStart[j] + 1 +config.inGraphDataPaddingX; } 
                        else if(config.inGraphDataXPosition==2) { xPos=yAxisPosX + yStart[j] + (HorizontalCalculateOffset((yFpt[j]>=0)*calculatedScale.graphMin+1*data.datasets[i].data[j], calculatedScale, valueHop) + (config.barStrokeWidth / 2))/2+config.inGraphDataPaddingX ;}
                        else if(config.inGraphDataXPosition==3) { xPos=yAxisPosX + yStart[j] + HorizontalCalculateOffset((yFpt[j]>=0)*calculatedScale.graphMin+1*data.datasets[i].data[j], calculatedScale, valueHop) + (config.barStrokeWidth / 2) +config.inGraphDataPaddingX ;}
                        if(config.inGraphDataYPosition==1) { yPos=barOffset + barWidth - config.inGraphDataPaddingY; }
                        else if(config.inGraphDataYPosition==2) { yPos=barOffset + barWidth/2- config.inGraphDataPaddingY; }
                        else if(config.inGraphDataYPosition==3) { yPos=barOffset- config.inGraphDataPaddingY; }

                        ctx.translate(xPos,yPos);

                        ctx.rotate(config.inGraphDataRotate * (Math.PI / 180));
      			            ctx.fillText(dispString, 0,0);
					    	        ctx.restore();


                        cumvalue[j] += data.datasets[i].data[j];
                        yStart[j] += animPc * HorizontalCalculateOffset((yFpt[j]>=0)*calculatedScale.graphMin + 1*data.datasets[i].data[j], calculatedScale, valueHop) + (config.barStrokeWidth / 2);
                        if (yFpt[j]==-1)yFpt[j]=i;                  
                      }
                }
              }
            }

        } ;

        function drawScale() {

            //X axis line                                                          

            ctx.lineWidth = config.scaleLineWidth;
            ctx.strokeStyle = config.scaleLineColor;
            ctx.beginPath();
            ctx.moveTo(yAxisPosX - config.scaleTickSizeLeft, xAxisPosY);
            ctx.lineTo(yAxisPosX + msr.availableWidth, xAxisPosY);
            ctx.stroke();

            for (var i = ((config.showYAxisMin) ? -1 : 0) ; i < calculatedScale.steps; i++) {
                if (i >= 0) {
                    ctx.beginPath();
                    ctx.moveTo(yAxisPosX + i * valueHop, xAxisPosY + config.scaleTickSizeBottom);
                    ctx.lineWidth = config.scaleGridLineWidth;
                    ctx.strokeStyle = config.scaleGridLineColor;

                    //Check i isnt 0, so we dont go over the Y axis twice.
                    if (config.scaleShowGridLines && i>0 && i % config.scaleXGridLinesStep==0 ) {
                        ctx.lineTo(yAxisPosX + i * valueHop, xAxisPosY - msr.availableHeight - config.scaleTickSizeTop);
                    }
                    else {
                        ctx.lineTo(yAxisPosX + i * valueHop, xAxisPosY);
                    }
                    ctx.stroke();
                }
            }

            //Y axis

            ctx.lineWidth = config.scaleLineWidth;
            ctx.strokeStyle = config.scaleLineColor;
            ctx.beginPath();
            ctx.moveTo(yAxisPosX, xAxisPosY + config.scaleTickSizeBottom);
            ctx.lineTo(yAxisPosX, xAxisPosY - msr.availableHeight - config.scaleTickSizeTop);
            ctx.stroke();

            for (var j = 0; j < data.labels.length; j++) {
                ctx.beginPath();
                ctx.moveTo(yAxisPosX - config.scaleTickSizeLeft, xAxisPosY - ((j + 1) * scaleHop));
                ctx.lineWidth = config.scaleGridLineWidth;
                ctx.strokeStyle = config.scaleGridLineColor;
                if (config.scaleShowGridLines &&  j % config.scaleYGridLinesStep==0 ) {
                    ctx.lineTo(yAxisPosX + msr.availableWidth, xAxisPosY - ((j + 1) * scaleHop));
                }
                else {
                    ctx.lineTo(yAxisPosX, xAxisPosY - ((j + 1) * scaleHop));
                }
                ctx.stroke();
            }
        } ;

        function drawLabels() {
            ctx.font = config.scaleFontStyle + " " + config.scaleFontSize + "px " + config.scaleFontFamily;

            //X axis line                                                          

            if(config.xAxisTop || config.xAxisBottom) {                                                    
              ctx.textBaseline = "top";
              if (msr.rotateLabels > 90) {
                  ctx.save();
                  ctx.textAlign = "left";
              }
              else if (msr.rotateLabels > 0) {
                  ctx.save();
                  ctx.textAlign = "right";
             }
              else {
                  ctx.textAlign = "center";
              }
              ctx.fillStyle = config.scaleFontColor;

              if(config.xAxisBottom){
                for (var i = ((config.showYAxisMin) ? -1 : 0) ; i < calculatedScale.steps; i++) {
                    ctx.save();
                    if (msr.rotateLabels > 0) {
                        ctx.translate(yAxisPosX + (i + 1) * valueHop- config.scaleFontSize/2, msr.xLabelPos);
                        ctx.rotate(-(msr.rotateLabels * (Math.PI / 180)));
                        ctx.fillText(calculatedScale.labels[i + 1], 0, 0);
                   }
                   else {
                      ctx.fillText(calculatedScale.labels[i + 1], yAxisPosX + ((i + 1) * valueHop), msr.xLabelPos);
                   }
                   ctx.restore();
                }
              }
            }

            //Y axis

            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            for (var j = 0; j < data.labels.length; j++) {
                if (config.scaleShowLabels) {
                    if (config.yAxisLeft) {
                        ctx.textAlign = "right";
                        ctx.fillText(fmtChartJS(config,data.labels[j],config.fmtXLabel), yAxisPosX - (config.scaleTickSizeLeft + 3), xAxisPosY - ((j + 1) * scaleHop) + barWidth / 2);
                    }
                    if (config.yAxisRight) {
                        ctx.textAlign = "left";
                        ctx.fillText(fmtChartJS(config,data.labels[j],config.fmtXLabel), yAxisPosX + msr.availableWidth + (config.scaleTickSizeRight + 3), xAxisPosY - ((j + 1) * scaleHop) + barWidth / 2);
                    }
                }
            }
        } ;

        function getValueBounds() {
           var upperValue = Number.MIN_VALUE;
            var lowerValue = Number.MAX_VALUE;

            var minvl = new Array(data.datasets.length);
            var maxvl = new Array(data.datasets.length);

            for (var i = 0; i < data.datasets.length; i++) {
                for (var j = 0; j < data.datasets[i].data.length; j++) {
                    var k = i;
                    var temp=0;
                    if (!(typeof(data.datasets[0].data[j])=='undefined')){
                      temp += 1*data.datasets[0].data[j];
                      if (temp > upperValue) { upperValue = temp; };
                      if (temp < lowerValue) { lowerValue = temp; };
                    }
                    while (k > 0) { //get max of stacked data
                        if (!(typeof(data.datasets[k].data[j])=='undefined')) {
                          temp += 1*data.datasets[k].data[j];
                          if (temp > upperValue) { upperValue = temp; };
                          if (temp < lowerValue) { lowerValue = temp; };
                        }
                        k--;
                    }
                }
            };


            // AJOUT CHANGEMENT
            if (!isNaN(config.graphMin)) lowerValue = config.graphMin;
            if (!isNaN(config.graphMax)) upperValue = config.graphMax;

			if (Math.abs(upperValue - lowerValue)<0.00000001) {
				upperValue = Max([upperValue*2,1]);
				lowerValue = 0;
			}


            var maxSteps = Math.floor((scaleHeight / (labelHeight * 0.66)));
            var minSteps = Math.floor((scaleHeight / labelHeight * 0.5));

            return {
                maxValue: upperValue,
                minValue: lowerValue,
                maxDailySteps: maxSteps,
                minSteps: minSteps
            };
        };
    } ;

    var Bar = function (data, config, ctx) {
        var maxSize, scaleHop, calculatedScale, labelHeight, scaleHeight, valueBounds, labelTemplateString, valueHop, widestXLabel, xAxisLength, yAxisPosX, xAxisPosY, barWidth, rotateLabels = 0, msr;
        var annotateCnt = 0;

        if (!dynamicFunction(data,config,ctx,"Bar"))return;
        
        jsGraphAnnotate[ctx.canvas.id] = new Array();

        defMouse(ctx,data,config,"Bar");

        setRect(ctx,config);
        valueBounds = getValueBounds();

        // true or fuzzy (error for negativ values (included 0))
        if (config.logarithmic !== false) {
            if (valueBounds.minValue <= 0) {
                config.logarithmic = false;
            }
        }

        // Check if logarithmic is meanigful
        var OrderOfMagnitude = calculateOrderOfMagnitude(Math.pow(10, calculateOrderOfMagnitude(valueBounds.maxValue) + 1)) - calculateOrderOfMagnitude(Math.pow(10, calculateOrderOfMagnitude(valueBounds.minValue)));
        if ((config.logarithmic == 'fuzzy' && OrderOfMagnitude < 4) || config.scaleOverride) {
            config.logarithmic = false;
        }

        //Check and set the scale
        labelTemplateString = (config.scaleShowLabels) ? config.scaleLabel : "";

        if (!config.scaleOverride) {
            calculatedScale = calculateScale(config, valueBounds.maxDailySteps, valueBounds.minSteps, valueBounds.maxValue, valueBounds.minValue, labelTemplateString);
            msr = setMeasures(data, config, ctx, height, width, calculatedScale.labels, true, false, true, true);
        }
        else {
            calculatedScale = {
                steps: config.scaleSteps,
                stepValue: config.scaleStepWidth,
                graphMin: config.scaleStartValue,
                graphMax: config.scaleStartValue+config.scaleSteps*config.scaleStepWidth,
                labels: []
            }
            populateLabels(config, labelTemplateString, calculatedScale.labels, calculatedScale.steps, config.scaleStartValue, calculatedScale.graphMax, config.scaleStepWidth);
            msr = setMeasures(data, config, ctx, height, width, calculatedScale.labels, true, false, true, true);
        }

        msr.availableHeight = msr.availableHeight - config.scaleTickSizeBottom - config.scaleTickSizeTop;
        msr.availableWidth = msr.availableWidth - config.scaleTickSizeLeft - config.scaleTickSizeRight;

        scaleHop = Math.floor(msr.availableHeight / calculatedScale.steps);
        valueHop = Math.floor(msr.availableWidth / (data.labels.length));
        if(valueHop ==0)valueHop = (msr.availableWidth / (data.labels.length - 1));

        msr.clrwidth=msr.clrwidth - (msr.availableWidth - ((data.labels.length) * valueHop));
        msr.availableWidth = (data.labels.length) * valueHop;
        msr.availableHeight = (calculatedScale.steps) * scaleHop;

        yAxisPosX = msr.leftNotUsableSize + config.scaleTickSizeLeft;
        xAxisPosY = msr.topNotUsableSize + msr.availableHeight + config.scaleTickSizeTop;

        barWidth = (valueHop - config.scaleGridLineWidth * 2 - (config.barValueSpacing * 2) - (config.barDatasetSpacing * data.datasets.length - 1) - ((config.barStrokeWidth / 2) * data.datasets.length - 1)) / data.datasets.length;

        var zeroY = 0;
        if (valueBounds.minValue < 0) {
            var zeroY = calculateOffset(config, 0, calculatedScale, scaleHop);
        }

        drawLabels();
        animationLoop(config, drawScale, drawBars, ctx, msr.clrx, msr.clry, msr.clrwidth, msr.clrheight, yAxisPosX + msr.availableWidth / 2, xAxisPosY - msr.availableHeight / 2, yAxisPosX, xAxisPosY, data);

        function drawBars(animPc) {
            var t1, t2, t3;

            var cumvalue = new Array();
            var totvalue = new Array();
            for (var i = 0; i < data.datasets.length; i++) { for (var j = 0; j < data.datasets[i].data.length; j++) { cumvalue[j] = 0; totvalue[j] = 0; } }
            for (var i = 0; i < data.datasets.length; i++) { for (var j = 0; j < data.datasets[i].data.length; j++) if (!(typeof(data.datasets[i].data[j])=='undefined'))totvalue[j] += 1*data.datasets[i].data[j]; }

            ctx.lineWidth = config.barStrokeWidth;
            for (var i = 0; i < data.datasets.length; i++) {
                ctx.fillStyle = data.datasets[i].fillColor;
                ctx.strokeStyle = data.datasets[i].strokeColor;
                if (animPc >= 1) {
                    if (typeof (data.datasets[i].title) == "string") lgtxt = data.datasets[i].title.trim();
                    else lgtxt = "";
                }

                for (var j = 0; j < data.datasets[i].data.length; j++) {
                  if (!(typeof(data.datasets[i].data[j])=='undefined')) {
                    var barOffset = yAxisPosX + config.barValueSpacing + valueHop * j + barWidth * i + config.barDatasetSpacing * i + config.barStrokeWidth * i;

                    ctx.beginPath();
                    ctx.moveTo(barOffset, xAxisPosY - zeroY);
                    ctx.lineTo(barOffset, xAxisPosY - animPc * calculateOffset(config, 1*data.datasets[i].data[j], calculatedScale, scaleHop) + (config.barStrokeWidth / 2));
                    ctx.lineTo(barOffset + barWidth, xAxisPosY - animPc * calculateOffset(config, 1*data.datasets[i].data[j], calculatedScale, scaleHop) + (config.barStrokeWidth / 2));
                    ctx.lineTo(barOffset + barWidth, xAxisPosY - zeroY);
                    if (config.barShowStroke) {
                        ctx.stroke();
                    }
                    ctx.closePath();
                    ctx.fill();

                    cumvalue[j] += 1*data.datasets[i].data[j];
                    if (animPc >= 1) {
                        if (typeof (data.labels[j]) == "string") lgtxt2 = data.labels[j].trim();
                        else lgtxt2 = "";
                        t1 = xAxisPosY - zeroY;
                        t2 = xAxisPosY - calculateOffset(config, 1*data.datasets[i].data[j], calculatedScale, scaleHop) + (config.barStrokeWidth / 2);
                        if (t1 < t2) { t3 = t1; t1 = t2; t2 = t3 }
                        jsGraphAnnotate[ctx.canvas.id][annotateCnt++] = ["RECT", barOffset, t1, barOffset + barWidth, t2, lgtxt, lgtxt2, 1*data.datasets[i].data[j], cumvalue[j], totvalue[j], i, j];
                    }
                  }
                }
            }

            if(animPc >=1 && config.inGraphDataShow) {
              for (var i = 0; i < data.datasets.length; i++) { for (var j = 0; j < data.datasets[i].data.length; j++) { cumvalue[j] = 0; } }

              for (var i = 0; i < data.datasets.length; i++) {
                if (typeof (data.datasets[i].title) == "string") lgtxt = data.datasets[i].title.trim();
                else lgtxt = "";

                for (var j = 0; j < data.datasets[i].data.length; j++) {

                  if (!(typeof(data.datasets[i].data[j])=='undefined')) {
                    if (typeof (data.labels[j]) == "string") lgtxt2 = data.labels[j].trim();

              			ctx.save();
                	  ctx.textAlign = config.inGraphDataAlign;
                    ctx.textBaseline = config.inGraphDataVAlign;
						        ctx.font = config.inGraphDataFontStyle + ' ' + config.inGraphDataFontSize + 'px ' + config.inGraphDataFontFamily;
       			        ctx.fillStyle = config.inGraphDataFontColor;

                    var barOffset = yAxisPosX + config.barValueSpacing + valueHop * j + barWidth * i + config.barDatasetSpacing * i + config.barStrokeWidth * i;
                    t1 = xAxisPosY - zeroY;
                    t2 = xAxisPosY - calculateOffset(config, 1*data.datasets[i].data[j], calculatedScale, scaleHop) + (config.barStrokeWidth / 2);

                    ctx.beginPath();
                    var yPos =0, xPos=0;

                    if(config.inGraphDataXPosition==1) { xPos=barOffset+config.inGraphDataPaddingX; } 
                    else if(config.inGraphDataXPosition==2) { xPos=barOffset+barWidth/2+config.inGraphDataPaddingX ;}
                    else if(config.inGraphDataXPosition==3) { xPos=barOffset+barWidth+config.inGraphDataPaddingX;} 
                    if(config.inGraphDataYPosition==1) { yPos=xAxisPosY - zeroY- config.inGraphDataPaddingY; }
                    else if(config.inGraphDataYPosition==2) { yPos=xAxisPosY -(calculateOffset(config, 1*data.datasets[i].data[j], calculatedScale, scaleHop) + (config.barStrokeWidth / 2))/2- config.inGraphDataPaddingY; }
                    else if(config.inGraphDataYPosition==3) { yPos=xAxisPosY -calculateOffset(config, 1*data.datasets[i].data[j], calculatedScale, scaleHop) + (config.barStrokeWidth / 2)- config.inGraphDataPaddingY; }
                    
                    ctx.translate(xPos,yPos);

                    var dispString = tmplbis(config.inGraphDataTmpl, { config:config, v1 : fmtChartJS(config,lgtxt,config.fmtV1), v2 : fmtChartJS(config,lgtxt2,config.fmtV2), v3 : fmtChartJS(config,1*data.datasets[i].data[j],config.fmtV3), v4 : fmtChartJS(config,cumvalue[j],config.fmtV4), v5 : fmtChartJS(config,totvalue[j],config.fmtV5), v6 : roundToWithThousands(config,fmtChartJS(config,100 * data.datasets[i].data[j] / totvalue[j],config.fmtV6),config.roundPct),v7 : fmtChartJS(config,barOffset,config.fmtV7),v8 : fmtChartJS(config,t1,config.fmtV8),v9 : fmtChartJS(config,barOffset + barWidth,config.fmtV9),v10 : fmtChartJS(config,t2,config.fmtV10),v11 : fmtChartJS(config,i,config.fmtV11), v12 : fmtChartJS(config,j,config.fmtV12)});
                    ctx.rotate(config.inGraphDataRotate * (Math.PI / 180));
       			        ctx.fillText(dispString, 0,0);
					    	    ctx.restore();

                    cumvalue[j] += 1*data.datasets[i].data[j];
                  }
                }
              }
                
            }
        } ;

        function drawScale() {

            //X axis line                                                          

            ctx.lineWidth = config.scaleLineWidth;
            ctx.strokeStyle = config.scaleLineColor;
            ctx.beginPath();
            ctx.moveTo(yAxisPosX - config.scaleTickSizeLeft, xAxisPosY);
            ctx.lineTo(yAxisPosX + msr.availableWidth + config.scaleTickSizeRight, xAxisPosY);
            ctx.stroke();

            for (var i = 0; i < data.labels.length; i++) {
                ctx.beginPath();
                ctx.moveTo(yAxisPosX + i * valueHop, xAxisPosY + config.scaleTickSizeBottom);
                ctx.lineWidth = config.scaleGridLineWidth;
                ctx.strokeStyle = config.scaleGridLineColor;

                //Check i isnt 0, so we dont go over the Y axis twice.
                if (config.scaleShowGridLines && i>0 && i % config.scaleXGridLinesStep==0 ) {
                    ctx.lineTo(yAxisPosX + i * valueHop, xAxisPosY - msr.availableHeight - config.scaleTickSizeTop);
                }
                else {
                    ctx.lineTo(yAxisPosX + i * valueHop, xAxisPosY);
                }
                ctx.stroke();
            }

            //Y axis

            ctx.lineWidth = config.scaleLineWidth;
            ctx.strokeStyle = config.scaleLineColor;
            ctx.beginPath();
            ctx.moveTo(yAxisPosX, xAxisPosY + config.scaleTickSizeBottom);
            ctx.lineTo(yAxisPosX, xAxisPosY - msr.availableHeight - config.scaleTickSizeTop);
            ctx.stroke();

            for (var j = 0 ; j < calculatedScale.steps; j++) {
               ctx.beginPath();
               ctx.moveTo(yAxisPosX - config.scaleTickSizeLeft, xAxisPosY - ((j + 1) * scaleHop));
               ctx.lineWidth = config.scaleGridLineWidth;
               ctx.strokeStyle = config.scaleGridLineColor;
               if (config.scaleShowGridLines && j % config.scaleYGridLinesStep==0 ) {
                   ctx.lineTo(yAxisPosX + msr.availableWidth + config.scaleTickSizeRight, xAxisPosY - ((j + 1) * scaleHop));
               }
               else {
                   ctx.lineTo(yAxisPosX, xAxisPosY - ((j + 1) * scaleHop));
               }
               ctx.stroke();
            }
        } ;

        function drawLabels() {
            ctx.font = config.scaleFontStyle + " " + config.scaleFontSize + "px " + config.scaleFontFamily;

            //X axis line                                                          
            if(config.xAxisTop || config.xAxisBottom) {                                                    
              ctx.textBaseline = "top";
              if (msr.rotateLabels > 90) {
                  ctx.save();
                  ctx.textAlign = "left";
              }
              else if (msr.rotateLabels > 0) {
                  ctx.save();
                  ctx.textAlign = "right";
              }
              else {
                  ctx.textAlign = "center";
              }
              ctx.fillStyle = config.scaleFontColor;

              if(config.xAxisBottom){
                for (var i = 0; i < data.labels.length; i++) {
                    ctx.save();
                    if (msr.rotateLabels > 0) {
                        ctx.translate(yAxisPosX + i * valueHop + (valueHop / 2)- config.scaleFontSize/2, msr.xLabelPos);
                        ctx.rotate(-(msr.rotateLabels * (Math.PI / 180)));
                        ctx.fillText(fmtChartJS(config,data.labels[i],config.fmtXLabel), 0, 0);
                    }
                    else {
                        ctx.fillText(fmtChartJS(config,data.labels[i],config.fmtXLabel), yAxisPosX + i * valueHop + (valueHop / 2), msr.xLabelPos);
                    }
                    ctx.restore();
                 }
              }
            }

            //Y axis

            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            for (var j = ((config.showYAxisMin) ? -1 : 0) ; j < calculatedScale.steps; j++) {
                if (config.scaleShowLabels) {
                    if (config.yAxisLeft) {
                        ctx.textAlign = "right";
                        ctx.fillText(calculatedScale.labels[j + 1], yAxisPosX - (config.scaleTickSizeLeft + 3), xAxisPosY - ((j + 1) * scaleHop));
                    }
                    if (config.yAxisRight) {
                        ctx.textAlign = "left";
                        ctx.fillText(calculatedScale.labels[j + 1], yAxisPosX + msr.availableWidth + (config.scaleTickSizeRight + 3), xAxisPosY - ((j + 1) * scaleHop));
                    }
                }
            }
        } ;

        function getValueBounds() {
            var upperValue = Number.MIN_VALUE;
            var lowerValue = Number.MAX_VALUE;
            for (var i = 0; i < data.datasets.length; i++) {
                for (var j = 0; j < data.datasets[i].data.length; j++) {
                    if (1*data.datasets[i].data[j] > upperValue) { upperValue = 1*data.datasets[i].data[j] };
                    if (1*data.datasets[i].data[j] < lowerValue) { lowerValue = 1*data.datasets[i].data[j] };
                }
            };

			if (Math.abs(upperValue - lowerValue)<0.00000001) {
				upperValue = Max([upperValue*2,1]);
				lowerValue = 0;
			}

            // AJOUT CHANGEMENT
            if (!isNaN(config.graphMin)) lowerValue = config.graphMin;
            if (!isNaN(config.graphMax)) upperValue = config.graphMax;

            var maxSteps = Math.floor((scaleHeight / (labelHeight * 0.66)));
            var minSteps = Math.floor((scaleHeight / labelHeight * 0.5));

            return {
                maxValue: upperValue,
                minValue: lowerValue,
                maxDailySteps: maxSteps,
                minSteps: minSteps
            };
        } ;
    } ;

    var HorizontalBar = function (data, config, ctx) {
        var maxSize, scaleHop, calculatedScale, labelHeight, scaleHeight, valueBounds, labelTemplateString, valueHop, widestXLabel, xAxisLength, yAxisPosX, xAxisPosY, barWidth, rotateLabels = 0, msr;

        if (!dynamicFunction(data,config,ctx,"HorizontalBar"))return;

        var annotateCnt = 0;
        jsGraphAnnotate[ctx.canvas.id] = new Array();

        defMouse(ctx,data,config,"HorizontalBar");

        setRect(ctx,config);
        valueBounds = getValueBounds();
        //Check and set the scale
        labelTemplateString = (config.scaleShowLabels) ? config.scaleLabel : "";

        if (!config.scaleOverride) {
            calculatedScale = calculateScale(config, valueBounds.maxDailySteps, valueBounds.minSteps, valueBounds.maxValue, valueBounds.minValue, labelTemplateString);
            msr = setMeasures(data, config, ctx, height, width, calculatedScale.labels, true, true, true, true);
        }
        else {
            calculatedScale = {
                steps: config.scaleSteps,
                stepValue: config.scaleStepWidth,
                graphMin: config.scaleStartValue,
                graphMax: config.scaleStartValue+config.scaleSteps*config.scaleStepWidth,
                labels: []
            }
            populateLabels(config, labelTemplateString, calculatedScale.labels, calculatedScale.steps, config.scaleStartValue, calculatedScale.graphMax, config.scaleStepWidth);
            msr = setMeasures(data, config, ctx, height, width, calculatedScale.labels, true, true, true, true);
        }

        msr.availableHeight = msr.availableHeight - config.scaleTickSizeBottom - config.scaleTickSizeTop;
        msr.availableWidth = msr.availableWidth - config.scaleTickSizeLeft - config.scaleTickSizeRight;

        scaleHop = Math.floor(msr.availableHeight / data.labels.length);
        valueHop = Math.floor(msr.availableWidth / (calculatedScale.steps));
        if(valueHop ==0)valueHop = (msr.availableWidth / (data.labels.length - 1));

        msr.clrwidth=msr.clrwidth - (msr.availableWidth - (calculatedScale.steps * valueHop));
        msr.availableWidth = (calculatedScale.steps) * valueHop;
        msr.availableHeight = (data.labels.length) * scaleHop;

        yAxisPosX = msr.leftNotUsableSize + config.scaleTickSizeLeft;
        xAxisPosY = msr.topNotUsableSize + msr.availableHeight + config.scaleTickSizeTop;

        barWidth = (scaleHop - config.scaleGridLineWidth * 2 - (config.barValueSpacing * 2) - (config.barDatasetSpacing * data.datasets.length - 1) - ((config.barStrokeWidth / 2) * data.datasets.length - 1)) / data.datasets.length;

        var zeroY = 0;
        if (valueBounds.minValue < 0) {
            var zeroY = calculateOffset(config, 0, calculatedScale, valueHop);
        }

        drawLabels();
        animationLoop(config, drawScale, drawBars, ctx, msr.clrx, msr.clry, msr.clrwidth, msr.clrheight, yAxisPosX + msr.availableWidth / 2, xAxisPosY - msr.availableHeight / 2, yAxisPosX, xAxisPosY, data);

        function drawBars(animPc) {
            var cumvalue = new Array();
            var totvalue = new Array();
            for (var i = 0; i < data.datasets.length; i++) { for (var j = 0; j < data.datasets[i].data.length; j++) { cumvalue[j] = 0; totvalue[j] = 0; } }
            for (var i = 0; i < data.datasets.length; i++) { for (var j = 0; j < data.datasets[i].data.length; j++) if (!(typeof(data.datasets[i].data[j])=='undefined'))totvalue[j] += 1*data.datasets[i].data[j]; }

            ctx.lineWidth = config.barStrokeWidth;
            for (var i = 0; i < data.datasets.length; i++) {
                ctx.fillStyle = data.datasets[i].fillColor;
                ctx.strokeStyle = data.datasets[i].strokeColor;
                if (animPc >= 1) {
                    if (typeof (data.datasets[i].title) == "string") lgtxt = data.datasets[i].title.trim();
                    else lgtxt = "";
                }
                for (var j = 0; j < data.datasets[i].data.length; j++) {
                  if (!(typeof(data.datasets[i].data[j])=='undefined')) {
                    var barOffset = xAxisPosY + config.barValueSpacing - scaleHop * (j + 1) + barWidth * i + config.barDatasetSpacing * i + config.barStrokeWidth * i;

	                  // Handle per-item colors
	                  if (data.datasets[i].hasOwnProperty('dataFillColors') && data.datasets[i].dataFillColors.hasOwnProperty(j)) {
		                  ctx.fillStyle = data.datasets[i].dataFillColors[j];
	                  }

	                  ctx.beginPath();
                    //            ctx.moveTo(yAxisPosX, barOffset);
                    ctx.moveTo(yAxisPosX + zeroY, barOffset);
                    ctx.lineTo(yAxisPosX + animPc * calculateOffset(config, 1*data.datasets[i].data[j], calculatedScale, valueHop) + (config.barStrokeWidth / 2), barOffset);
                    ctx.lineTo(yAxisPosX + animPc * calculateOffset(config, 1*data.datasets[i].data[j], calculatedScale, valueHop) + (config.barStrokeWidth / 2), barOffset + barWidth);
                    //            ctx.lineTo(yAxisPosX, barOffset+barWidth);
                    ctx.lineTo(yAxisPosX + zeroY, barOffset + barWidth);

                    if (config.barShowStroke) {
                        ctx.stroke();
                    }
                    ctx.closePath();
                    ctx.fill();

                    cumvalue[j] += 1*data.datasets[i].data[j];
                    if (animPc >= 1) {
                        if (typeof (data.labels[j]) == "string") lgtxt2 = data.labels[j].trim();
                        else lgtxt2 = "";
                        t1 = yAxisPosX + zeroY;
                        t2 = yAxisPosX + calculateOffset(config, 1*data.datasets[i].data[j], calculatedScale, valueHop) + (config.barStrokeWidth / 2)
                        if (t1 > t2) { t3 = t1; t1 = t2; t2 = t3 }

                        jsGraphAnnotate[ctx.canvas.id][annotateCnt++] = ["RECT", t1, barOffset + barWidth, t2, barOffset, lgtxt, lgtxt2, 1*data.datasets[i].data[j], cumvalue[j], totvalue[j], i, j];
                    }
                  }
                }
            }
  
          if(animPc >=1 && config.inGraphDataShow) {
              for (var i = 0; i < data.datasets.length; i++) { for (var j = 0; j < data.datasets[i].data.length; j++) { cumvalue[j] = 0; } }

              for (var i = 0; i < data.datasets.length; i++) {
                if (typeof (data.datasets[i].title) == "string") lgtxt = data.datasets[i].title.trim();
                else lgtxt = "";

                for (var j = 0; j < data.datasets[i].data.length; j++) {
                  if (!(typeof(data.datasets[i].data[j])=='undefined')) {

                    if (typeof (data.labels[j]) == "string") lgtxt2 = data.labels[j].trim();

              			ctx.save();
                	  ctx.textAlign = config.inGraphDataAlign;
                    ctx.textBaseline = config.inGraphDataVAlign;
						        ctx.font = config.inGraphDataFontStyle + ' ' + config.inGraphDataFontSize + 'px ' + config.inGraphDataFontFamily;
       			        ctx.fillStyle = config.inGraphDataFontColor;

                    var barOffset = xAxisPosY + config.barValueSpacing - scaleHop * (j + 1) + barWidth * i + config.barDatasetSpacing * i + config.barStrokeWidth * i;
                    t1 = yAxisPosX + zeroY;
                    t2 = yAxisPosX + calculateOffset(config, 1*data.datasets[i].data[j], calculatedScale, valueHop) + (config.barStrokeWidth / 2)
                    if (t1 > t2) { t3 = t1; t1 = t2; t2 = t3 }

                    ctx.beginPath();
                    var yPos =0, xPos=0;

                    if(config.inGraphDataYPosition==1) { yPos=barOffset-config.inGraphDataPaddingY+barWidth; } 
                    else if(config.inGraphDataYPosition==2) { yPos=barOffset+barWidth/2-config.inGraphDataPaddingY ;}
                    else if(config.inGraphDataYPosition==3) { yPos=barOffset-config.inGraphDataPaddingY;} 

                    if(config.inGraphDataXPosition==1) { xPos=yAxisPosX + zeroY +config.inGraphDataPaddingX; }
                    else if(config.inGraphDataXPosition==2) { xPos=yAxisPosX + (calculateOffset(config, 1*data.datasets[i].data[j], calculatedScale, valueHop) + (config.barStrokeWidth / 2))/2 + config.inGraphDataPaddingX; }
                    else if(config.inGraphDataXPosition==3) { xPos=yAxisPosX + calculateOffset(config, 1*data.datasets[i].data[j], calculatedScale, valueHop) + (config.barStrokeWidth / 2) + config.inGraphDataPaddingX; }
                    
                    ctx.translate(xPos,yPos);

                    var dispString = tmplbis(config.inGraphDataTmpl, { config:config, v1 : fmtChartJS(config,lgtxt,config.fmtV1), v2 : fmtChartJS(config,lgtxt2,config.fmtV2), v3 : fmtChartJS(config,1*data.datasets[i].data[j],config.fmtV3), v4 : fmtChartJS(config,cumvalue[j],config.fmtV4), v5 : fmtChartJS(config,totvalue[j],config.fmtV5), v6 : roundToWithThousands(config,fmtChartJS(config,100 * data.datasets[i].data[j] / totvalue[j],config.fmtV6),config.roundPct),v7 : fmtChartJS(config,t1,config.fmtV7),v8 : fmtChartJS(config,barOffset + barWidth,config.fmtV8),v9 : fmtChartJS(config,t2,config.fmtV9),v10 : fmtChartJS(config,barOffset,config.fmtV10),v11 : fmtChartJS(config,i,config.fmtV11), v12 : fmtChartJS(config,j,config.fmtV12)});
                    ctx.rotate(config.inGraphDataRotate * (Math.PI / 180));
       			        ctx.fillText(dispString, 0,0);
					    	    ctx.restore();

                    cumvalue[j] += 1*data.datasets[i].data[j];
                  }
                }
              }
                  
            }
  

        } ;

        function drawScale() {

            //X axis line                                                          

            ctx.lineWidth = config.scaleLineWidth;
            ctx.strokeStyle = config.scaleLineColor;
            ctx.beginPath();
            ctx.moveTo(yAxisPosX - config.scaleTickSizeLeft, xAxisPosY);
            ctx.lineTo(yAxisPosX + msr.availableWidth + config.scaleTickSizeRight, xAxisPosY);
            ctx.stroke();

            for (var i = ((config.showYAxisMin) ? -1 : 0) ; i < calculatedScale.steps; i++) {
                if (i >= 0) {
                    ctx.beginPath();
                    ctx.moveTo(yAxisPosX + i * valueHop, xAxisPosY + config.scaleTickSizeBottom);
                    ctx.lineWidth = config.scaleGridLineWidth;
                    ctx.strokeStyle = config.scaleGridLineColor;

                    //Check i isnt 0, so we dont go over the Y axis twice.
                    if (config.scaleShowGridLines && i>0 && i % config.scaleXGridLinesStep==0 ) {
                        ctx.lineTo(yAxisPosX + i * valueHop, xAxisPosY - msr.availableHeight - config.scaleTickSizeTop);
                    }
                    else {
                        ctx.lineTo(yAxisPosX + i * valueHop, xAxisPosY);
                    }
                    ctx.stroke();
                }
            }

            //Y axis

            ctx.lineWidth = config.scaleLineWidth;
            ctx.strokeStyle = config.scaleLineColor;
            ctx.beginPath();
            ctx.moveTo(yAxisPosX, xAxisPosY + config.scaleTickSizeBottom);
            ctx.lineTo(yAxisPosX, xAxisPosY - msr.availableHeight - config.scaleTickSizeTop);
            ctx.stroke();

            for (var j = 0; j < data.labels.length; j++) {
                ctx.beginPath();
                ctx.moveTo(yAxisPosX - config.scaleTickSizeLeft, xAxisPosY - ((j + 1) * scaleHop));
                ctx.lineWidth = config.scaleGridLineWidth;
                ctx.strokeStyle = config.scaleGridLineColor;
                if (config.scaleShowGridLines && j % config.scaleYGridLinesStep==0 ) {
                    ctx.lineTo(yAxisPosX + msr.availableWidth + config.scaleTickSizeRight, xAxisPosY - ((j + 1) * scaleHop));
                }
                else {
                    ctx.lineTo(yAxisPosX, xAxisPosY - ((j + 1) * scaleHop));
                }
                ctx.stroke();
            }
        } ;

        function drawLabels() {
            ctx.font = config.scaleFontStyle + " " + config.scaleFontSize + "px " + config.scaleFontFamily;

            //X axis line                                                          
            if(config.xAxisTop || config.xAxisBottom) {                                                    
              ctx.textBaseline = "top";
              if (msr.rotateLabels > 90) {
                  ctx.save();
                  ctx.textAlign = "left";
              }
              else if (msr.rotateLabels > 0) {
                  ctx.save();
                  ctx.textAlign = "right";
              }
              else {
                  ctx.textAlign = "center";
              }
              ctx.fillStyle = config.scaleFontColor;

              if(config.xAxisBottom){
                for (var i = ((config.showYAxisMin) ? -1 : 0) ; i < calculatedScale.steps; i++) {
                    ctx.save();
                    if (msr.rotateLabels > 0) {
                        ctx.translate(yAxisPosX + (i + 1) * valueHop - config.scaleFontSize/2, msr.xLabelPos);
                        ctx.rotate(-(msr.rotateLabels * (Math.PI / 180)));
                        ctx.fillText(calculatedScale.labels[i + 1], 0, 0);
                    }
                    else {
                        ctx.fillText(calculatedScale.labels[i + 1], yAxisPosX + (i + 1) * valueHop, msr.xLabelPos);
                    }
                    ctx.restore();
                }
              }
            }

            //Y axis

            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            for (var j = 0; j < data.labels.length; j++) {
                if (config.scaleShowLabels) {
                    if (config.yAxisLeft) {
                        ctx.textAlign = "right";
                        ctx.fillText(fmtChartJS(config,data.labels[j],config.fmtXLabel), yAxisPosX - (config.scaleTickSizeLeft + 3), xAxisPosY - (j * scaleHop) - scaleHop / 2);
                    }
                    if (config.yAxisRight) {
                        ctx.textAlign = "left";
                        ctx.fillText(fmtChartJS(config,data.labels[j],config.fmtXLabel), yAxisPosX + msr.availableWidth + (config.scaleTickSizeRight + 3), xAxisPosY - (j * scaleHop) - scaleHop / 2);
                    }
                }
            }
        } ;

        function getValueBounds() {
            var upperValue = Number.MIN_VALUE;
            var lowerValue = Number.MAX_VALUE;
            for (var i = 0; i < data.datasets.length; i++) {
                for (var j = 0; j < data.datasets[i].data.length; j++) {
                    if (1*data.datasets[i].data[j] > upperValue) { upperValue = 1*data.datasets[i].data[j] };
                    if (1*data.datasets[i].data[j] < lowerValue) { lowerValue = 1*data.datasets[i].data[j] };
                }
            };
            
			if (Math.abs(upperValue - lowerValue)<0.00000001) {
				upperValue = Max([upperValue*2,1]);
				lowerValue = 0;
			}

            // AJOUT CHANGEMENT
            if (!isNaN(config.graphMin)) lowerValue = config.graphMin;
            if (!isNaN(config.graphMax)) upperValue = config.graphMax;

            var maxSteps = Math.floor((scaleHeight / (labelHeight * 0.66)));
            var minSteps = Math.floor((scaleHeight / labelHeight * 0.5));

            return {
                maxValue: upperValue,
                minValue: lowerValue,
                maxDailySteps: maxSteps,
                minSteps: minSteps
            };
        } ;
    } ;

    function calculateOffset(config, val, calculatedScale, scaleHop) {
        if (!config.logarithmic) { // no logarithmic scale
            var outerValue = calculatedScale.steps * calculatedScale.stepValue;
            var adjustedValue = val - calculatedScale.graphMin;
            var scalingFactor = CapValue(adjustedValue / outerValue, 1, 0);
            return (scaleHop * calculatedScale.steps) * scalingFactor;
        } else { // logarithmic scale
            return CapValue(log10(val) * scaleHop - calculateOrderOfMagnitude(calculatedScale.graphMin) * scaleHop, undefined, 0);
        }
    } ;

    function animationLoop(config, drawScale, drawData, ctx, clrx, clry, clrwidth, clrheight, midPosX, midPosY, borderX, borderY, data) {

        var cntiter=0;
        
        if (isIE() < 9 && isIE() != false) config.animation = false;

        var animFrameAmount = (config.animation) ? 1 / CapValue(config.animationSteps, Number.MAX_VALUE, 1) : 1,
  			easingFunction = animationOptions[config.animationEasing],
	  		percentAnimComplete = (config.animation) ? 0 : 1;

        if (typeof drawScale !== "function") drawScale = function () { };

        if(config.clearRect)requestAnimFrame(animLoop);
        else animLoop();
        

        function animateFrame() {
            var easeAdjustedAnimationPercent = (config.animation) ? CapValue(easingFunction(percentAnimComplete), null, 0) : 1;

            if(1*cntiter>=1*CapValue(config.animationSteps, Number.MAX_VALUE, 1) || config.animation==false)easeAdjustedAnimationPercent=1;
            else if(easeAdjustedAnimationPercent>=1)easeAdjustedAnimationPercent=0.9999;

            if (!(isIE() < 9 && isIE() != false) && config.clearRect) ctx.clearRect(clrx, clry, clrwidth, clrheight);

            dispCrossText(ctx, config, midPosX, midPosY, borderX, borderY, false, data, easeAdjustedAnimationPercent,cntiter);

            if (config.scaleOverlay) {
                drawData(easeAdjustedAnimationPercent);
                drawScale();
            } else {
                drawScale();
                drawData(easeAdjustedAnimationPercent);
            }
            dispCrossText(ctx, config, midPosX, midPosY, borderX, borderY, true, data, easeAdjustedAnimationPercent,cntiter);
        };
        function animLoop() {
            //We need to check if the animation is incomplete (less than 1), or complete (1).
            cntiter++;
            percentAnimComplete += animFrameAmount;
            if(cntiter==config.animationSteps || config.animation==false )percentAnimComplete=1;
            animateFrame();
            //Stop the loop continuing forever
            if (percentAnimComplete < 1) {
                requestAnimFrame(animLoop);
            }
            else {
                if (typeof config.onAnimationComplete == "function") config.onAnimationComplete();
            }
        } ;
    } ;

    //Declare global functions to be called within this namespace here.

    // shim layer with setTimeout fallback
    var requestAnimFrame = (function () {
        return window.requestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.oRequestAnimationFrame ||
			window.msRequestAnimationFrame ||
			function (callback) {
			    window.setTimeout(callback, 1000/60 );
			};
    })();

    function calculateScale(config, maxSteps, minSteps, maxValue, minValue, labelTemplateString) {
        var graphMin, graphMax, graphRange, stepValue, numberOfSteps, valueRange, rangeOrderOfMagnitude, decimalNum;

        if (!config.logarithmic) { // no logarithmic scale
            valueRange = maxValue - minValue;
            rangeOrderOfMagnitude = calculateOrderOfMagnitude(valueRange);
            graphMin = Math.floor(minValue / (1 * Math.pow(10, rangeOrderOfMagnitude))) * Math.pow(10, rangeOrderOfMagnitude);
            graphMax = Math.ceil(maxValue / (1 * Math.pow(10, rangeOrderOfMagnitude))) * Math.pow(10, rangeOrderOfMagnitude);
        }
        else { // logarithmic scale
            graphMin = Math.pow(10, calculateOrderOfMagnitude(minValue));
            graphMax = Math.pow(10, calculateOrderOfMagnitude(maxValue) + 1);
            rangeOrderOfMagnitude = calculateOrderOfMagnitude(graphMax) - calculateOrderOfMagnitude(graphMin);
        }

        graphRange = graphMax - graphMin;
        stepValue = Math.pow(10, rangeOrderOfMagnitude);
        numberOfSteps = Math.round(graphRange / stepValue);

        if (!config.logarithmic) { // no logarithmic scale
            //Compare number of steps to the max and min for that size graph, and add in half steps if need be.	        
            while (numberOfSteps < minSteps || numberOfSteps > maxSteps) {
                if (numberOfSteps < minSteps) {
                    stepValue /= 2;
                    numberOfSteps = Math.round(graphRange / stepValue);
                }
                else {
                    stepValue *= 2;
                    numberOfSteps = Math.round(graphRange / stepValue);
                }
            }
        } else { // logarithmic scale
            numberOfSteps = rangeOrderOfMagnitude; // so scale is  10,100,1000,...
        }

        var labels = [];

        populateLabels(config, labelTemplateString, labels, numberOfSteps, graphMin, graphMax, stepValue);

        return {
            steps: numberOfSteps,
            stepValue: stepValue,
            graphMin: graphMin,
            labels: labels,
            maxValue: maxValue
        }
    } ;

    function calculateOrderOfMagnitude(val) {
        return Math.floor(Math.log(val) / Math.LN10);
    } ;

    //Populate an array of all the labels by interpolating the string.
    function populateLabels(config, labelTemplateString, labels, numberOfSteps, graphMin, graphMax, stepValue) {
        if (labelTemplateString) {
            //Fix floating point errors by setting to fixed the on the same decimal as the stepValue.
            if (!config.logarithmic) { // no logarithmic scale
                for (var i = 0; i < numberOfSteps + 1; i++) {
                    labels.push(tmpl(labelTemplateString, { value: fmtChartJS(config,1*((graphMin + (stepValue * i)).toFixed(getDecimalPlaces(stepValue))),config.fmtYLabel) }));
                }
            } else { // logarithmic scale 10,100,1000,...
                var value = graphMin;
                while (value < graphMax) {
                    labels.push(tmpl(labelTemplateString, { value: fmtChartJS(config,1*value.toFixed(getDecimalPlaces(stepValue)),config.fmtYLabel) }));
                    value *= 10;
                }
            }
        }
    } ;

    //Max value from array
    function Max(array) {
        return Math.max.apply(Math, array);
    };

    //Min value from array
    function Min(array) {
        return Math.min.apply(Math, array);
    };
    //Default if undefined

    function Default(userDeclared, valueIfFalse) {
        if (!userDeclared) {
            return valueIfFalse;
        } else {
            return userDeclared;
        }
    };

    //Is a number function
    function isNumber(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    } ;

    //Apply cap a value at a high or low number
    function CapValue(valueToCap, maxValue, minValue) {
        if (isNumber(maxValue)) {
            if (valueToCap > maxValue) {
                return maxValue;
            }
        }
        if (isNumber(minValue)) {
            if (valueToCap < minValue) {
                return minValue;
            }
        }
        return valueToCap;
    };

    function getDecimalPlaces(num) {
        var numberOfDecimalPlaces;
        if (num % 1 != 0) {
            return num.toString().split(".")[1].length
        }
        else {
            return 0;
        }

    };

    function mergeChartConfig(defaults, userDefined) {
        var returnObj = {};
        for (var attrname in defaults) { returnObj[attrname] = defaults[attrname]; }
        for (var attrname in userDefined) { returnObj[attrname] = userDefined[attrname]; }
        return returnObj;
    };

    //Javascript micro templating by John Resig - source at http://ejohn.org/blog/javascript-micro-templating/
    var cache = {};

    function tmpl(str, data) {
        // Figure out if we're getting a template, or if we need to
        // load the template - and be sure to cache the result.
        var fn = !/\W/.test(str) ?
	      cache[str] = cache[str] ||
	        tmpl(document.getElementById(str).innerHTML) :

	      // Generate a reusable function that will serve as a template
	      // generator (and which will be cached).
	      new Function("obj",
	        "var p=[],print=function(){p.push.apply(p,arguments);};" +

	        // Introduce the data as local variables using with(){}
	        "with(obj){p.push('" +

	        // Convert the template into pure JavaScript
	        str
	          .replace(/[\r\t\n]/g, " ")
	          .split("<%").join("\t")
	          .replace(/((^|%>)[^\t]*)'/g, "$1\r")
	          .replace(/\t=(.*?)%>/g, "',$1,'")
	          .split("\t").join("');")
	          .split("%>").join("p.push('")
	          .split("\r").join("\\'")
	      + "');}return p.join('');");

        // Provide some basic currying to the user
        return data ? fn(data) : fn;
    };

    function dispCrossText(ctx, config, posX, posY, borderX, borderY, overlay, data, animPC,cntiter) {

        var i, disptxt, txtposx, txtposy, txtAlign, txtBaseline;

        for (i = 0; i < config.crossText.length; i++) {
 
            if (config.crossText[i] != "" && config.crossTextOverlay[Min([i, config.crossTextOverlay.length - 1])] == overlay  && ((cntiter==1 && config.crossTextIter[Min([i, config.crossTextIter.length - 1])]=="first") || config.crossTextIter[Min([i, config.crossTextIter.length - 1])]==cntiter || config.crossTextIter[Min([i, config.crossTextIter.length - 1])]=="all" || (animPC==1 && config.crossTextIter[Min([i, config.crossTextIter.length - 1])]=="last")) ) {
                ctx.save();
                ctx.beginPath();
                ctx.font = config.crossTextFontStyle[Min([i, config.crossTextFontStyle.length - 1])] + " " + config.crossTextFontSize[Min([i, config.crossTextFontSize.length - 1])] + "px " + config.crossTextFontFamily[Min([i, config.crossTextFontFamily.length - 1])];
                ctx.fillStyle = config.crossTextFontColor[Min([i, config.crossTextFontColor.length - 1])];

                textAlign = config.crossTextAlign[Min([i, config.crossTextAlign.length - 1])];
                textBaseline = config.crossTextBaseline[Min([i, config.crossTextBaseline.length - 1])];

                txtposx = 1 * config.crossTextPosX[Min([i, config.crossTextPosX.length - 1])];
                txtposy = 1 * config.crossTextPosY[Min([i, config.crossTextPosY.length - 1])];

                switch (1 * config.crossTextRelativePosX[Min([i, config.crossTextRelativePosX.length - 1])]) {
                    case 0:
                        if (textAlign == "default") textAlign = "left";
                        break;
                    case 1:
                        txtposx += borderX;
                        if (textAlign == "default") textAlign = "right";
                        break;
                    case 2:
                        txtposx += posX;
                        if (textAlign == "default") textAlign = "center";
                        break;
                    case -2:
                        txtposx += context.canvas.width / 2;
                        if (textAlign == "default") textAlign = "center";
                        break;
                    case 3:
                        txtposx += txtposx + 2 * posX - borderX;
                        if (textAlign == "default") textAlign = "left";
                        break;
                    case 4:
                        // posX=width;
                        txtposx += context.canvas.width;
                        if (textAlign == "default") textAlign = "right";
                        break;
                    default:
                        txtposx += posX;
                        if (textAlign == "default") textAlign = "center";
                        break;
                }

                switch (1 * config.crossTextRelativePosY[Min([i, config.crossTextRelativePosY.length - 1])]) {
                    case 0:
                        if (textBaseline == "default") textBaseline = "top";
                        break;
                    case 3:
                        txtposy += borderY;
                        if (textBaseline == "default") textBaseline = "top";
                        break;
                    case 2:
                        txtposy += posY;
                        if (textBaseline == "default") textBaseline = "middle";
                        break;
                    case -2:
                        txtposy += context.canvas.height / 2;
                        if (textBaseline == "default") textBaseline = "middle";
                        break;
                    case 1:
                        txtposy += txtposy + 2 * posY - borderY;
                        if (textBaseline == "default") textBaseline = "bottom";
                        break;
                    case 4:
                        txtposy += context.canvas.height;
                        if (textBaseline == "default") textBaseline = "bottom";
                        break;
                    default:
                        txtposy += posY;
                        if (textBaseline == "default") textBaseline = "middle";
                        break;
                }

                ctx.textAlign = textAlign;
                ctx.textBaseline = textBaseline;

                ctx.translate(1 * txtposx, 1 * txtposy);

                ctx.rotate(config.crossTextAngle[Min([i, config.crossTextAngle.length - 1])]);

                if (config.crossText[i].substring(0, 1) == "%") {
                    if (typeof config.crossTextFunction == "function") disptxt = config.crossTextFunction(i, config.crossText[i], ctx, config, posX, posY, borderX, borderY, overlay, data, animPC);
                }
                else disptxt = config.crossText[i];

                ctx.fillText(disptxt, 0, 0);
                ctx.stroke();
                ctx.restore();
            }
        }
    };

    //****************************************************************************************
    function setMeasures(data, config, ctx, height, width, ylabels, reverseLegend, reverseAxis, drawAxis, drawLegendOnData) {
   
        if(config.canvasBackgroundColor != "none") ctx.canvas.style.background =config.canvasBackgroundColor;

        var borderWidth = 0;

        var yAxisLabelWidth = 0;
        var yAxisLabelPos = 0;

        var graphTitleHeight = 0;
        var graphTitlePosY = 0;

        var graphSubTitleHeight = 0;
        var graphSubTitlePosY = 0;

        var footNoteHeight = 0;
        var footNotePosY = 0;

        var yAxisUnitHeight = 0;
        var yAxisUnitPosY = 0;

        var widestLegend = 0;
        var nbeltLegend = 0;
        var nbLegendLines = 0;
        var nbLegendCols = 0;
        var spaceLegendHeight = 0;
        var xFirstLegendTextPos = 0;
        var yFirstLegendTextPos = 0;
        var xLegendBorderPos = 0;
        var yLegendBorderPos = 0;

        var yAxisLabelWidth = 0;
        var yAxisLabelPos = 0;

        var xAxisLabelHeight = 0;
        var xLabelHeight = 0;

        var widestXLabel = 1;

        var leftNotUsableSize = 0;
        var rightNotUsableSize = 0;

        var rotateLabels = 0;
        var xLabelPos = 0;

        // Borders

        if (config.canvasBorders) borderWidth = config.canvasBordersWidth;

        // compute widest X label

        if (drawAxis) {
            ctx.font = config.scaleFontStyle + " " + config.scaleFontSize + "px " + config.scaleFontFamily;
            for (var i = 0; i < data.labels.length; i++) {
                var textLength = ctx.measureText(fmtChartJS(config,data.labels[i],config.fmtXLabel)).width;
                //If the text length is longer - make that equal to longest text!
                widestXLabel = (textLength > widestXLabel) ? textLength : widestXLabel;
            }
        }

        // compute Y Label Width

        widestYLabel = 1;

        if (drawAxis) {
            if (ylabels != null) {
                ctx.font = config.scaleFontStyle + " " + config.scaleFontSize + "px " + config.scaleFontFamily;
                for (var i = ylabels.length - 1; i >= 0; i--) {
                    if (typeof (ylabels[i]) == "string") {
                        if (ylabels[i].trim() != "") {
                            var textLength = ctx.measureText(fmtChartJS(config,ylabels[i],config.fmtYLabel)).width;
                            //If the text length is longer - make that equal to longest text!
                            widestYLabel = (textLength > widestYLabel) ? textLength : widestYLabel;
                        }
                    }
                }
            }
        }

        // yAxisLabel
        leftNotUsableSize = borderWidth + config.spaceLeft
        rightNotUsableSize = borderWidth + config.spaceRight;

        if (drawAxis) {
            if (typeof (config.yAxisLabel) != "undefined") {
                if (config.yAxisLabel.trim() != "") {
                    yAxisLabelWidth = (config.yAxisFontSize + config.yAxisLabelSpaceLeft + config.yAxisLabelSpaceRight);
                    yAxisLabelPosLeft = borderWidth + config.spaceLeft + config.yAxisLabelSpaceLeft + config.yAxisFontSize;
                    yAxisLabelPosRight = width - borderWidth - config.spaceRight - config.yAxisLabelSpaceRight - config.yAxisFontSize;
                }
            }

            if (config.yAxisLeft) {
                if (reverseAxis == false) leftNotUsableSize = borderWidth + config.spaceLeft + yAxisLabelWidth + widestYLabel + 3 + config.yAxisSpaceLeft + config.yAxisSpaceRight;
                else leftNotUsableSize = borderWidth + config.spaceLeft + yAxisLabelWidth + widestXLabel + 3 + config.yAxisSpaceLeft + config.yAxisSpaceRight;
            }

            if (config.yAxisRight) {
                if (reverseAxis == false) rightNotUsableSize = borderWidth + config.spaceRight + yAxisLabelWidth + widestYLabel + 3 + config.yAxisSpaceLeft + config.yAxisSpaceRight;
                else rightNotUsableSize = borderWidth + config.spaceRight + yAxisLabelWidth + widestXLabel + 3 + config.yAxisSpaceLeft + config.yAxisSpaceRight;
            }
        }

        availableWidth = width - leftNotUsableSize - rightNotUsableSize;

        // Title

        if (config.graphTitle.trim() != "") {
            graphTitleHeight = (config.graphTitleFontSize + config.graphTitleSpaceBefore + config.graphTitleSpaceAfter);
            graphTitlePosY = borderWidth + config.spaceTop + graphTitleHeight - config.graphTitleSpaceAfter;
        }

        // subTitle

        if (config.graphSubTitle.trim() != "") {
            graphSubTitleHeight = (config.graphSubTitleFontSize + config.graphSubTitleSpaceBefore + config.graphSubTitleSpaceAfter);
            graphSubTitlePosY = borderWidth + config.spaceTop + graphTitleHeight + graphSubTitleHeight - config.graphSubTitleSpaceAfter;
        }

        // yAxisUnit

        if (drawAxis) {
            if (typeof (config.yAxisUnit) != "undefined") {
                if (config.yAxisUnit.trim() != "") {
                    yAxisUnitHeight = (config.yAxisUnitFontSize + config.yAxisUnitSpaceBefore + config.yAxisUnitSpaceAfter);
                    yAxisUnitPosY = borderWidth + config.spaceTop + graphTitleHeight + graphSubTitleHeight + yAxisUnitHeight - config.yAxisUnitSpaceAfter;
                }
            }
        }

        topNotUsableSize = borderWidth + config.spaceTop + graphTitleHeight + graphSubTitleHeight + yAxisUnitHeight + config.graphSpaceBefore;

        // footNote

        if (typeof (config.footNote) != "undefined") {
            if (config.footNote.trim() != "") {
                footNoteHeight = (config.footNoteFontSize + config.footNoteSpaceBefore + config.footNoteSpaceAfter);
                footNotePosY = height - config.spaceBottom - borderWidth - config.footNoteSpaceAfter;
            }
        }

        // compute space for Legend
        if (typeof (config.legend) != "undefined") {
            if (config.legend == true) {
                ctx.font = config.legendFontStyle + " " + config.legendFontSize + "px " + config.legendFontFamily;
                if (drawLegendOnData) {
                    for (var i = data.datasets.length - 1; i >= 0; i--) {
                        if (typeof (data.datasets[i].title) == "string") {

                            if (data.datasets[i].title.trim() != "") {
                                nbeltLegend++;
                                var textLength = ctx.measureText(data.datasets[i].title).width;
                                //If the text length is longer - make that equal to longest text!
                                widestLegend = (textLength > widestLegend) ? textLength : widestLegend;
                            }
                        }
                    }
                } else {
                    for (var i = data.length - 1; i >= 0; i--) {
                        if (typeof (data[i].title) == "string") {
                            if (data[i].title.trim() != "") {
                                nbeltLegend++;
                                var textLength = ctx.measureText(data[i].title).width;
                                //If the text length is longer - make that equal to longest text!
                                widestLegend = (textLength > widestLegend) ? textLength : widestLegend;
                            }
                        }
                    }
                }

                if (nbeltLegend > 1) {
                    widestLegend += config.legendBlockSize + config.legendSpaceBetweenBoxAndText;

                    availableLegendWidth = width - config.spaceLeft - config.spaceRight - 2 * (borderWidth) - config.legendSpaceLeftText - config.legendSpaceRightText;
                    if (config.legendBorders == true) availableLegendWidth -= 2 * (config.legendBordersWidth) - config.legendBordersSpaceLeft - config.legendBordersSpaceRight;

                    maxLegendOnLine = Math.floor((availableLegendWidth + config.legendSpaceBetweenTextHorizontal )/ (widestLegend + config.legendSpaceBetweenTextHorizontal ));
                    nbLegendLines = Math.ceil(nbeltLegend / maxLegendOnLine);

                    nbLegendCols = Math.ceil(nbeltLegend / nbLegendLines);

                    spaceLegendHeight = nbLegendLines * (config.legendFontSize + config.legendSpaceBetweenTextVertical) - config.legendSpaceBetweenTextVertical + config.legendSpaceBeforeText + config.legendSpaceAfterText;

                    yFirstLegendTextPos = height - borderWidth - config.spaceBottom - footNoteHeight - spaceLegendHeight + config.legendSpaceBeforeText + config.legendFontSize;

                    xFirstLegendTextPos = config.spaceLeft + (width - config.spaceLeft - config.spaceRight - nbLegendCols * (widestLegend + config.legendSpaceBetweenTextHorizontal) + config.legendSpaceBetweenTextHorizontal ) / 2 ;
                    if (config.legendBorders == true) {
                        spaceLegendHeight += 2 * config.legendBordersWidth + config.legendBordersSpaceBefore + config.legendBordersSpaceAfter;
                        yFirstLegendTextPos -= (config.legendBordersWidth + config.legendBordersSpaceAfter);
                        yLegendBorderPos = Math.floor(height - borderWidth - config.spaceBottom  - footNoteHeight - spaceLegendHeight + (config.legendBordersWidth / 2) + config.legendBordersSpaceBefore);
                        xLegendBorderPos = Math.floor(xFirstLegendTextPos - config.legendSpaceLeftText - (config.legendBordersWidth / 2));
                        legendBorderHeight = Math.ceil(spaceLegendHeight - config.legendBordersWidth) - config.legendBordersSpaceBefore - config.legendBordersSpaceAfter;
                        legendBorderWidth = Math.ceil(nbLegendCols * (widestLegend + config.legendSpaceBetweenTextHorizontal)) - config.legendSpaceBetweenTextHorizontal + config.legendBordersWidth + config.legendSpaceRightText + config.legendSpaceLeftText;
                    }
                }
            }
        }

        // xAxisLabel

        if (drawAxis) {
            if (typeof (config.xAxisLabel) != "undefined") {
                if (config.xAxisLabel.trim() != "") {
                    xAxisLabelHeight = (config.xAxisFontSize + config.xAxisLabelSpaceBefore + config.xAxisLabelSpaceAfter);
                    xAxisLabelPos = height - borderWidth - config.spaceBottom - footNoteHeight - spaceLegendHeight - config.xAxisLabelSpaceAfter;
                }
            }
        }

        xLabelWidth = 0;

        if (drawAxis && (config.xAxisBottom || config.xAxisTop)) {
            if (reverseAxis == false) { widestLabel = widestXLabel; nblab = data.labels.length; }
            else { widestLabel = widestYLabel; nblab = ylabels.length; }
            if (config.rotateLabels == "smart") {
                rotateLabels = 0;
                if ((availableWidth + config.xAxisSpaceBetweenLabels) / nblab < (widestLabel + config.xAxisSpaceBetweenLabels)) {
                    rotateLabels = 45;
                    if (availableWidth / nblab < Math.abs(Math.cos(rotateLabels * Math.PI / 180) * widestLabel)) {
                        rotateLabels = 90;
                    }
                }
            } else {
                rotateLabels = config.rotateLabels
                if (rotateLabels < 0) rotateLabels = 0;
                if (rotateLabels > 180) rotateLabels = 180;
            }

            if (rotateLabels > 90) rotateLabels += 180;
            xLabelHeight = Math.abs(Math.sin(rotateLabels * Math.PI / 180) * widestLabel) + Math.abs(Math.sin((rotateLabels + 90) * Math.PI / 180) * config.scaleFontSize) + config.xAxisSpaceBefore + config.xAxisSpaceAfter;
            xLabelPos = height - borderWidth - config.spaceBottom - footNoteHeight - spaceLegendHeight - xAxisLabelHeight - (xLabelHeight - config.xAxisSpaceBefore);
            xLabelWidth = Math.abs(Math.cos(rotateLabels * Math.PI / 180) * widestLabel) + Math.abs(Math.cos((rotateLabels + 90) * Math.PI / 180) * config.scaleFontSize);

            leftNotUsableSize = Max([leftNotUsableSize, borderWidth + config.spaceLeft + xLabelWidth / 2]);
            rightNotUsableSize = Max([rightNotUsableSize, borderWidth + config.spaceRight + xLabelWidth / 2]);
            availableWidth = width - leftNotUsableSize - rightNotUsableSize;
        }

        if(config.xAxisBottom)
        {
          bottomNotUsableHeightWithoutXLabels = borderWidth + config.spaceBottom + footNoteHeight + spaceLegendHeight + xAxisLabelHeight;
          bottomNotUsableHeightWithXLabels = bottomNotUsableHeightWithoutXLabels + xLabelHeight;
          availableHeight = height - topNotUsableSize - bottomNotUsableHeightWithXLabels;
        }
        else
        {
          bottomNotUsableHeightWithoutXLabels = borderWidth + config.spaceBottom + footNoteHeight + spaceLegendHeight + xAxisLabelHeight;
          bottomNotUsableHeightWithXLabels = bottomNotUsableHeightWithoutXLabels ;
          availableHeight = height - topNotUsableSize - bottomNotUsableHeightWithXLabels;
        }

        // ----------------------- DRAW EXTERNAL ELEMENTS -------------------------------------------------

        // Draw Borders

        if (borderWidth > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.lineWidth = 2 * borderWidth;
            ctx.strokeStyle = config.canvasBordersColor;
            ctx.moveTo(0, 0);
            ctx.lineTo(0, height);
            ctx.lineTo(width, height);
            ctx.lineTo(width, 0);
            ctx.lineTo(0, 0);
            ctx.stroke();
            ctx.restore();
        }

        // Draw Graph Title

        if (graphTitleHeight > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.font = config.graphTitleFontStyle + " " + config.graphTitleFontSize + "px " + config.graphTitleFontFamily;
            ctx.fillStyle = config.graphTitleFontColor;
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.translate(config.spaceLeft + (width - config.spaceLeft - config.spaceRight) / 2, graphTitlePosY);
            ctx.fillText(config.graphTitle, 0, 0);
            ctx.stroke();
            ctx.restore();
        }

        // Draw Graph Sub-Title

        if (graphSubTitleHeight > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.font = config.graphSubTitleFontStyle + " " + config.graphSubTitleFontSize + "px " + config.graphSubTitleFontFamily;
            ctx.fillStyle = config.graphSubTitleFontColor;
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.translate(config.spaceLeft + (width - config.spaceLeft - config.spaceRight) / 2, graphSubTitlePosY);
            ctx.fillText(config.graphSubTitle, 0, 0);
            ctx.stroke();
            ctx.restore();
        }

        // Draw Y Axis Unit

        if (yAxisUnitHeight > 0) {
            if (config.yAxisLeft) {
                ctx.save();
                ctx.beginPath();
                ctx.font = config.yAxisUnitFontStyle + " " + config.yAxisUnitFontSize + "px " + config.yAxisUnitFontFamily;
                ctx.fillStyle = config.yAxisUnitFontColor;
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                ctx.translate(leftNotUsableSize, yAxisUnitPosY);
                ctx.fillText(config.yAxisUnit, 0, 0);
                ctx.stroke();
                ctx.restore();
            }
            if (config.yAxisRight) {
                ctx.save();
                ctx.beginPath();
                ctx.font = config.yAxisUnitFontStyle + " " + config.yAxisUnitFontSize + "px " + config.yAxisUnitFontFamily;
                ctx.fillStyle = config.yAxisUnitFontColor;
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                ctx.translate(width - rightNotUsableSize, yAxisUnitPosY);
                ctx.fillText(config.yAxisUnit, 0, 0);
                ctx.stroke();
                ctx.restore();
            }
        }

        // Draw Y Axis Label

        if (yAxisLabelWidth > 0) {
            if (config.yAxisLeft) {
                ctx.save();
                ctx.beginPath();
                ctx.font = config.yAxisFontStyle + " " + config.yAxisFontSize + "px " + config.yAxisFontFamily;
                ctx.fillStyle = config.yAxisFontColor;
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                ctx.translate(yAxisLabelPosLeft, topNotUsableSize + (availableHeight / 2));
                ctx.rotate(-(90 * (Math.PI / 180)));
                ctx.fillText(config.yAxisLabel, 0, 0);
                ctx.stroke();
                ctx.restore();
            }
            if (config.yAxisRight) {
                ctx.save();
                ctx.beginPath();
                ctx.font = config.yAxisFontStyle + " " + config.yAxisFontSize + "px " + config.yAxisFontFamily;
                ctx.fillStyle = config.yAxisFontColor;
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                ctx.translate(yAxisLabelPosRight, topNotUsableSize + (availableHeight / 2));
                ctx.rotate(+(90 * (Math.PI / 180)));
                ctx.fillText(config.yAxisLabel, 0, 0);
                ctx.stroke();
                ctx.restore();
            }
        }

        // Draw X Axis Label

        if (xAxisLabelHeight > 0) {
            if (config.xAxisBottom) {
              ctx.save();
              ctx.beginPath();
              ctx.font = config.xAxisFontStyle + " " + config.xAxisFontSize + "px " + config.xAxisFontFamily;
              ctx.fillStyle = config.xAxisFontColor;
              ctx.textAlign = "center";
              ctx.textBaseline = "bottom";
              ctx.translate(leftNotUsableSize + (availableWidth / 2), xAxisLabelPos);
              ctx.fillText(config.xAxisLabel, 0, 0);
              ctx.stroke();
              ctx.restore();
            }
        }

        // Draw Legend

        if (nbeltLegend > 1) {
            if (config.legendBorders == true) {
                ctx.save();
                ctx.beginPath();

                ctx.lineWidth = config.legendBordersWidth;
                ctx.strokeStyle = config.legendBordersColors;

                ctx.moveTo(xLegendBorderPos, yLegendBorderPos);
                ctx.lineTo(xLegendBorderPos, yLegendBorderPos + legendBorderHeight);
                ctx.lineTo(xLegendBorderPos + legendBorderWidth, yLegendBorderPos + legendBorderHeight);
                ctx.lineTo(xLegendBorderPos + legendBorderWidth, yLegendBorderPos);
                ctx.lineTo(xLegendBorderPos, yLegendBorderPos);
                ctx.lineTo(xLegendBorderPos + legendBorderWidth, yLegendBorderPos);
                ctx.lineTo(xLegendBorderPos, yLegendBorderPos);
                ctx.lineTo(xLegendBorderPos, yLegendBorderPos + legendBorderHeight);

                ctx.stroke();
                ctx.restore();
            }

            nbcols = nbLegendCols - 1;
            ypos = yFirstLegendTextPos - (config.legendFontSize + config.legendSpaceBetweenTextVertical);
            xpos = 0;

            if (drawLegendOnData) fromi = data.datasets.length;
            else fromi = data.length;

            for (var i = fromi - 1; i >= 0; i--) {
                orderi = i;
                if (reverseLegend) {
                    if (drawLegendOnData) orderi = data.datasets.length - i - 1;
                    else orderi = data.length - i - 1;
                }

                if (drawLegendOnData) tpof = typeof (data.datasets[orderi].title);
                else tpof = typeof (data[orderi].title)

                if (tpof == "string") {
                    if (drawLegendOnData) lgtxt = data.datasets[orderi].title.trim();
                    else lgtxt = data[orderi].title.trim();
                    if (lgtxt != "") {
                        nbcols++;
                        if (nbcols == nbLegendCols) {
                            nbcols = 0;
                            xpos = xFirstLegendTextPos;
                            ypos += config.legendFontSize + config.legendSpaceBetweenTextVertical;
                        }
                        else {
                            xpos += widestLegend + config.legendSpaceBetweenTextHorizontal;
                        }

                        ctx.save();
                        ctx.beginPath();

                        if (drawLegendOnData) ctx.strokeStyle = data.datasets[orderi].strokeColor;
                        else ctx.strokeStyle = data[orderi].color;

                        if (config.datasetFill) {
                            ctx.lineWidth = 1;
                            ctx.moveTo(xpos , ypos);
                            ctx.lineTo(xpos + config.legendBlockSize, ypos);
                            ctx.lineTo(xpos + config.legendBlockSize, ypos - config.legendFontSize );
                            ctx.lineTo(xpos , ypos - config.legendFontSize );
                            ctx.lineTo(xpos , ypos);
                            ctx.closePath();
                            if (drawLegendOnData) ctx.fillStyle = data.datasets[orderi].fillColor;
                            else ctx.fillStyle = data[orderi].color;
                            ctx.fill();
                        }
                        else {
                            ctx.lineWidth = config.datasetStrokeWidth;
                            ctx.moveTo(xpos + 2, ypos - (config.legendFontSize / 2));
                            ctx.lineTo(xpos + 2 + config.legendBlockSize, ypos - (config.legendFontSize / 2));
                        }
                        ctx.stroke();
                        ctx.restore();
                        ctx.save();
                        ctx.beginPath();
                        ctx.font = config.legendFontStyle + " " + config.legendFontSize + "px " + config.legendFontFamily;
                        ctx.fillStyle = config.legendFontColor;
                        ctx.textAlign = "left";
                        ctx.textBaseline = "bottom";
                        ctx.translate(xpos + config.legendBlockSize + config.legendSpaceBetweenBoxAndText, ypos);
                        ctx.fillText(lgtxt, 0, 0);
                        ctx.stroke();
                        ctx.restore();
                    }
                }
            }
        }

        // Draw FootNote
        if (config.footNote.trim() != "") {
            ctx.save();
            ctx.font = config.footNoteFontStyle + " " + config.footNoteFontSize + "px " + config.footNoteFontFamily;
            ctx.fillStyle = config.footNoteFontColor;
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.translate(leftNotUsableSize + (availableWidth / 2), footNotePosY);
            ctx.fillText(config.footNote, 0, 0);
            ctx.stroke();
            ctx.restore();
        }

        clrx = leftNotUsableSize;        
        clrwidth = availableWidth;
        clry = topNotUsableSize;
        clrheight = availableHeight;

        return {
            leftNotUsableSize: leftNotUsableSize,
            rightNotUsableSize: rightNotUsableSize,
            availableWidth: availableWidth,
            topNotUsableSize: topNotUsableSize,
            bottomNotUsableHeightWithoutXLabels: bottomNotUsableHeightWithoutXLabels,
            bottomNotUsableHeightWithXLabels: bottomNotUsableHeightWithXLabels,
            availableHeight: availableHeight,
            widestXLabel: widestXLabel,
            rotateLabels: rotateLabels,
            xLabelPos: xLabelPos,
            clrx: clrx,
            clry: clry,
            clrwidth: clrwidth,
            clrheight: clrheight
        };
    } ;

    function log10(val) {
        return Math.log(val) / Math.LN10;
    } ;
    
    function setRect(ctx,config)
    {
        if(config.clearRect){
          clear(ctx);
          ctx.clearRect(0, 0, width, height);
        } else {
          clear(ctx);
          ctx.clearRect(0, 0, width, height);
          ctx.fillStyle = config.savePngBackgroundColor;
          ctx.strokeStyle = config.savePngBackgroundColor;
          ctx.beginPath();
          ctx.moveTo(0,0);
          ctx.lineTo(0,ctx.canvas.height);
          ctx.lineTo(ctx.canvas.width,ctx.canvas.height);
          ctx.lineTo(ctx.canvas.width,0);
          ctx.lineTo(0,0);
          ctx.stroke();
          ctx.fill(); 

        }
    } ;

    
    function defMouse(ctx,data,config,tpgraph) {

        if (config.annotateDisplay == true) {
            if (cursorDivCreated == false) oCursor = new makeCursorObj('divCursor');
            if (isIE() < 9 && isIE() != false) ctx.canvas.attachEvent("on" + config.annotateFunction.split(' ')[0], function (event) { 
              if ((config.annotateFunction.split(' ')[1]=="left" && event.which==1) ||
                  (config.annotateFunction.split(' ')[1]=="middle" && event.which==2) ||
                  (config.annotateFunction.split(' ')[1]=="right" && event.which==3) ||
                  (typeof(config.annotateFunction.split(' ')[1])!="string")) doMouseMove(ctx, config, event) 
              });
            else ctx.canvas.addEventListener(config.annotateFunction.split(' ')[0], function (event) { 
              if ((config.annotateFunction.split(' ')[1]=="left" && event.which==1) ||
                  (config.annotateFunction.split(' ')[1]=="middle" && event.which==2) ||
                  (config.annotateFunction.split(' ')[1]=="right" && event.which==3) ||
                  (typeof(config.annotateFunction.split(' ')[1])!="string")) doMouseMove(ctx, config, event) 
            }, false);
        }
        
        if(config.savePng)
        {
            if (isIE() < 9 && isIE() != false) ctx.canvas.attachEvent("on"+ config.savePngFunction.split(' ')[0], function(event) { 
              if ((config.savePngFunction.split(' ')[1]=="left" && event.which==1) ||
                  (config.savePngFunction.split(' ')[1]=="middle" && event.which==2) ||
                  (config.savePngFunction.split(' ')[1]=="right" && event.which==3) ||
                  (typeof(config.savePngFunction.split(' ')[1])!="string")) saveCanvas(ctx,data,config,tpgraph); 
              });  
            else ctx.canvas.addEventListener(config.savePngFunction.split(' ')[0], function (event) {   
              if ((config.savePngFunction.split(' ')[1]=="left" && event.which==1) ||
                  (config.savePngFunction.split(' ')[1]=="middle" && event.which==2) ||
                  (config.savePngFunction.split(' ')[1]=="right" && event.which==3) ||
                  (typeof(config.savePngFunction.split(' ')[1])!="string")) saveCanvas(ctx,data,config,tpgraph); 
              }
              ,false);
  
        }

    };
    
};

/*!
 * Simple jQuery Equal Heights
 *
 * Copyright (c) 2013 Matt Banks
 * Dual licensed under the MIT and GPL licenses.
 * Uses the same license as jQuery, see:
 * http://docs.jquery.com/License
 *
 * @version 1.5.1
 */
!function(a){a.fn.equalHeights=function(){var b=0,c=a(this);return c.each(function(){var c=a(this).innerHeight();c>b&&(b=c)}),c.css("height",b)},a("[data-equal]").each(function(){var b=a(this),c=b.data("equal");b.find(c).equalHeights()})}(jQuery);
/*!
 * Smooth Scroll - v1.4.13 - 2013-11-02
 * https://github.com/kswedberg/jquery-smooth-scroll
 * Copyright (c) 2013 Karl Swedberg
 * Licensed MIT (https://github.com/kswedberg/jquery-smooth-scroll/blob/master/LICENSE-MIT)
 */
(function(t){function e(t){return t.replace(/(:|\.)/g,"\\$1")}var l="1.4.13",o={},s={exclude:[],excludeWithin:[],offset:0,direction:"top",scrollElement:null,scrollTarget:null,beforeScroll:function(){},afterScroll:function(){},easing:"swing",speed:400,autoCoefficent:2,preventDefault:!0},n=function(e){var l=[],o=!1,s=e.dir&&"left"==e.dir?"scrollLeft":"scrollTop";return this.each(function(){if(this!=document&&this!=window){var e=t(this);e[s]()>0?l.push(this):(e[s](1),o=e[s]()>0,o&&l.push(this),e[s](0))}}),l.length||this.each(function(){"BODY"===this.nodeName&&(l=[this])}),"first"===e.el&&l.length>1&&(l=[l[0]]),l};t.fn.extend({scrollable:function(t){var e=n.call(this,{dir:t});return this.pushStack(e)},firstScrollable:function(t){var e=n.call(this,{el:"first",dir:t});return this.pushStack(e)},smoothScroll:function(l,o){if(l=l||{},"options"===l)return o?this.each(function(){var e=t(this),l=t.extend(e.data("ssOpts")||{},o);t(this).data("ssOpts",l)}):this.first().data("ssOpts");var s=t.extend({},t.fn.smoothScroll.defaults,l),n=t.smoothScroll.filterPath(location.pathname);return this.unbind("click.smoothscroll").bind("click.smoothscroll",function(l){var o=this,r=t(this),i=t.extend({},s,r.data("ssOpts")||{}),c=s.exclude,a=i.excludeWithin,f=0,h=0,u=!0,d={},p=location.hostname===o.hostname||!o.hostname,m=i.scrollTarget||(t.smoothScroll.filterPath(o.pathname)||n)===n,S=e(o.hash);if(i.scrollTarget||p&&m&&S){for(;u&&c.length>f;)r.is(e(c[f++]))&&(u=!1);for(;u&&a.length>h;)r.closest(a[h++]).length&&(u=!1)}else u=!1;u&&(i.preventDefault&&l.preventDefault(),t.extend(d,i,{scrollTarget:i.scrollTarget||S,link:o}),t.smoothScroll(d))}),this}}),t.smoothScroll=function(e,l){if("options"===e&&"object"==typeof l)return t.extend(o,l);var s,n,r,i,c=0,a="offset",f="scrollTop",h={},u={};"number"==typeof e?(s=t.extend({link:null},t.fn.smoothScroll.defaults,o),r=e):(s=t.extend({link:null},t.fn.smoothScroll.defaults,e||{},o),s.scrollElement&&(a="position","static"==s.scrollElement.css("position")&&s.scrollElement.css("position","relative"))),f="left"==s.direction?"scrollLeft":f,s.scrollElement?(n=s.scrollElement,/^(?:HTML|BODY)$/.test(n[0].nodeName)||(c=n[f]())):n=t("html, body").firstScrollable(s.direction),s.beforeScroll.call(n,s),r="number"==typeof e?e:l||t(s.scrollTarget)[a]()&&t(s.scrollTarget)[a]()[s.direction]||0,h[f]=r+c+s.offset,i=s.speed,"auto"===i&&(i=h[f]||n.scrollTop(),i/=s.autoCoefficent),u={duration:i,easing:s.easing,complete:function(){s.afterScroll.call(s.link,s)}},s.step&&(u.step=s.step),n.length?n.stop().animate(h,u):s.afterScroll.call(s.link,s)},t.smoothScroll.version=l,t.smoothScroll.filterPath=function(t){return t.replace(/^\//,"").replace(/(?:index|default).[a-zA-Z]{3,4}$/,"").replace(/\/$/,"")},t.fn.smoothScroll.defaults=s})(jQuery);
/*
 * jQuery throttle / debounce - v1.1 - 3/7/2010
 * http://benalman.com/projects/jquery-throttle-debounce-plugin/
 * 
 * Copyright (c) 2010 "Cowboy" Ben Alman
 * Dual licensed under the MIT and GPL licenses.
 * http://benalman.com/about/license/
 */
(function(b,c){var $=b.jQuery||b.Cowboy||(b.Cowboy={}),a;$.throttle=a=function(e,f,j,i){var h,d=0;if(typeof f!=="boolean"){i=j;j=f;f=c}function g(){var o=this,m=+new Date()-d,n=arguments;function l(){d=+new Date();j.apply(o,n)}function k(){h=c}if(i&&!h){l()}h&&clearTimeout(h);if(i===c&&m>e){l()}else{if(f!==true){h=setTimeout(i?k:l,i===c?e-m:e)}}}if($.guid){g.guid=j.guid=j.guid||$.guid++}return g};$.debounce=function(d,e,f){return f===c?a(d,e,false):a(d,f,e!==false)}})(this);
//     Underscore.js 1.6.0
//     http://underscorejs.org
//     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.6.0';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return obj;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
    return obj;
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var result;
    any(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(predicate, context);
    each(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, function(value, index, list) {
      return !predicate.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(predicate, context);
    each(obj, function(value, index, list) {
      if (!(result = result && predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(predicate, context);
    each(obj, function(value, index, list) {
      if (result || (result = predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matches(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matches(attrs));
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    var result = -Infinity, lastComputed = -Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed > lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    var result = Infinity, lastComputed = Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed < lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Shuffle an array, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (obj.length !== +obj.length) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return value;
    return _.property(value);
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, iterator, context) {
    iterator = lookupIterator(iterator);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iterator, context) {
      var result = {};
      iterator = lookupIterator(iterator);
      each(obj, function(value, index) {
        var key = iterator.call(context, value, index, obj);
        behavior(result, key, value);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, key, value) {
    _.has(result, key) ? result[key].push(value) : result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, key, value) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, key) {
    _.has(result, key) ? result[key]++ : result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[0];
    if (n < 0) return [];
    return slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[array.length - 1];
    return slice.call(array, Math.max(array.length - n, 0));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Split an array into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(array, predicate) {
    var pass = [], fail = [];
    each(array, function(elem) {
      (predicate(elem) ? pass : fail).push(elem);
    });
    return [pass, fail];
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.contains(other, item);
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, 'length').concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(length);

    while(idx < length) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    return function() {
      var position = 0;
      var args = boundArgs.slice();
      for (var i = 0, length = args.length; i < length; i++) {
        if (args[i] === _) args[i] = arguments[position++];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return func.apply(this, args);
    };
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error('bindAll must be passed function names');
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
        context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;
      if (last < wait) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = new Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))
                        && ('constructor' in a && 'constructor' in b)) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  _.constant = function(value) {
    return function () {
      return value;
    };
  };

  _.property = function(key) {
    return function(obj) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of `key:value` pairs.
  _.matches = function(attrs) {
    return function(obj) {
      if (obj === attrs) return true; //avoid comparing an object to itself.
      for (var key in attrs) {
        if (attrs[key] !== obj[key])
          return false;
      }
      return true;
    }
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() { return new Date().getTime(); };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}).call(this);

//! moment.js
//! version : 2.7.0
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com
(function(a){function b(a,b,c){switch(arguments.length){case 2:return null!=a?a:b;case 3:return null!=a?a:null!=b?b:c;default:throw new Error("Implement me")}}function c(){return{empty:!1,unusedTokens:[],unusedInput:[],overflow:-2,charsLeftOver:0,nullInput:!1,invalidMonth:null,invalidFormat:!1,userInvalidated:!1,iso:!1}}function d(a,b){function c(){mb.suppressDeprecationWarnings===!1&&"undefined"!=typeof console&&console.warn&&console.warn("Deprecation warning: "+a)}var d=!0;return j(function(){return d&&(c(),d=!1),b.apply(this,arguments)},b)}function e(a,b){return function(c){return m(a.call(this,c),b)}}function f(a,b){return function(c){return this.lang().ordinal(a.call(this,c),b)}}function g(){}function h(a){z(a),j(this,a)}function i(a){var b=s(a),c=b.year||0,d=b.quarter||0,e=b.month||0,f=b.week||0,g=b.day||0,h=b.hour||0,i=b.minute||0,j=b.second||0,k=b.millisecond||0;this._milliseconds=+k+1e3*j+6e4*i+36e5*h,this._days=+g+7*f,this._months=+e+3*d+12*c,this._data={},this._bubble()}function j(a,b){for(var c in b)b.hasOwnProperty(c)&&(a[c]=b[c]);return b.hasOwnProperty("toString")&&(a.toString=b.toString),b.hasOwnProperty("valueOf")&&(a.valueOf=b.valueOf),a}function k(a){var b,c={};for(b in a)a.hasOwnProperty(b)&&Ab.hasOwnProperty(b)&&(c[b]=a[b]);return c}function l(a){return 0>a?Math.ceil(a):Math.floor(a)}function m(a,b,c){for(var d=""+Math.abs(a),e=a>=0;d.length<b;)d="0"+d;return(e?c?"+":"":"-")+d}function n(a,b,c,d){var e=b._milliseconds,f=b._days,g=b._months;d=null==d?!0:d,e&&a._d.setTime(+a._d+e*c),f&&hb(a,"Date",gb(a,"Date")+f*c),g&&fb(a,gb(a,"Month")+g*c),d&&mb.updateOffset(a,f||g)}function o(a){return"[object Array]"===Object.prototype.toString.call(a)}function p(a){return"[object Date]"===Object.prototype.toString.call(a)||a instanceof Date}function q(a,b,c){var d,e=Math.min(a.length,b.length),f=Math.abs(a.length-b.length),g=0;for(d=0;e>d;d++)(c&&a[d]!==b[d]||!c&&u(a[d])!==u(b[d]))&&g++;return g+f}function r(a){if(a){var b=a.toLowerCase().replace(/(.)s$/,"$1");a=bc[a]||cc[b]||b}return a}function s(a){var b,c,d={};for(c in a)a.hasOwnProperty(c)&&(b=r(c),b&&(d[b]=a[c]));return d}function t(b){var c,d;if(0===b.indexOf("week"))c=7,d="day";else{if(0!==b.indexOf("month"))return;c=12,d="month"}mb[b]=function(e,f){var g,h,i=mb.fn._lang[b],j=[];if("number"==typeof e&&(f=e,e=a),h=function(a){var b=mb().utc().set(d,a);return i.call(mb.fn._lang,b,e||"")},null!=f)return h(f);for(g=0;c>g;g++)j.push(h(g));return j}}function u(a){var b=+a,c=0;return 0!==b&&isFinite(b)&&(c=b>=0?Math.floor(b):Math.ceil(b)),c}function v(a,b){return new Date(Date.UTC(a,b+1,0)).getUTCDate()}function w(a,b,c){return bb(mb([a,11,31+b-c]),b,c).week}function x(a){return y(a)?366:365}function y(a){return a%4===0&&a%100!==0||a%400===0}function z(a){var b;a._a&&-2===a._pf.overflow&&(b=a._a[tb]<0||a._a[tb]>11?tb:a._a[ub]<1||a._a[ub]>v(a._a[sb],a._a[tb])?ub:a._a[vb]<0||a._a[vb]>23?vb:a._a[wb]<0||a._a[wb]>59?wb:a._a[xb]<0||a._a[xb]>59?xb:a._a[yb]<0||a._a[yb]>999?yb:-1,a._pf._overflowDayOfYear&&(sb>b||b>ub)&&(b=ub),a._pf.overflow=b)}function A(a){return null==a._isValid&&(a._isValid=!isNaN(a._d.getTime())&&a._pf.overflow<0&&!a._pf.empty&&!a._pf.invalidMonth&&!a._pf.nullInput&&!a._pf.invalidFormat&&!a._pf.userInvalidated,a._strict&&(a._isValid=a._isValid&&0===a._pf.charsLeftOver&&0===a._pf.unusedTokens.length)),a._isValid}function B(a){return a?a.toLowerCase().replace("_","-"):a}function C(a,b){return b._isUTC?mb(a).zone(b._offset||0):mb(a).local()}function D(a,b){return b.abbr=a,zb[a]||(zb[a]=new g),zb[a].set(b),zb[a]}function E(a){delete zb[a]}function F(a){var b,c,d,e,f=0,g=function(a){if(!zb[a]&&Bb)try{require("./lang/"+a)}catch(b){}return zb[a]};if(!a)return mb.fn._lang;if(!o(a)){if(c=g(a))return c;a=[a]}for(;f<a.length;){for(e=B(a[f]).split("-"),b=e.length,d=B(a[f+1]),d=d?d.split("-"):null;b>0;){if(c=g(e.slice(0,b).join("-")))return c;if(d&&d.length>=b&&q(e,d,!0)>=b-1)break;b--}f++}return mb.fn._lang}function G(a){return a.match(/\[[\s\S]/)?a.replace(/^\[|\]$/g,""):a.replace(/\\/g,"")}function H(a){var b,c,d=a.match(Fb);for(b=0,c=d.length;c>b;b++)d[b]=hc[d[b]]?hc[d[b]]:G(d[b]);return function(e){var f="";for(b=0;c>b;b++)f+=d[b]instanceof Function?d[b].call(e,a):d[b];return f}}function I(a,b){return a.isValid()?(b=J(b,a.lang()),dc[b]||(dc[b]=H(b)),dc[b](a)):a.lang().invalidDate()}function J(a,b){function c(a){return b.longDateFormat(a)||a}var d=5;for(Gb.lastIndex=0;d>=0&&Gb.test(a);)a=a.replace(Gb,c),Gb.lastIndex=0,d-=1;return a}function K(a,b){var c,d=b._strict;switch(a){case"Q":return Rb;case"DDDD":return Tb;case"YYYY":case"GGGG":case"gggg":return d?Ub:Jb;case"Y":case"G":case"g":return Wb;case"YYYYYY":case"YYYYY":case"GGGGG":case"ggggg":return d?Vb:Kb;case"S":if(d)return Rb;case"SS":if(d)return Sb;case"SSS":if(d)return Tb;case"DDD":return Ib;case"MMM":case"MMMM":case"dd":case"ddd":case"dddd":return Mb;case"a":case"A":return F(b._l)._meridiemParse;case"X":return Pb;case"Z":case"ZZ":return Nb;case"T":return Ob;case"SSSS":return Lb;case"MM":case"DD":case"YY":case"GG":case"gg":case"HH":case"hh":case"mm":case"ss":case"ww":case"WW":return d?Sb:Hb;case"M":case"D":case"d":case"H":case"h":case"m":case"s":case"w":case"W":case"e":case"E":return Hb;case"Do":return Qb;default:return c=new RegExp(T(S(a.replace("\\","")),"i"))}}function L(a){a=a||"";var b=a.match(Nb)||[],c=b[b.length-1]||[],d=(c+"").match(_b)||["-",0,0],e=+(60*d[1])+u(d[2]);return"+"===d[0]?-e:e}function M(a,b,c){var d,e=c._a;switch(a){case"Q":null!=b&&(e[tb]=3*(u(b)-1));break;case"M":case"MM":null!=b&&(e[tb]=u(b)-1);break;case"MMM":case"MMMM":d=F(c._l).monthsParse(b),null!=d?e[tb]=d:c._pf.invalidMonth=b;break;case"D":case"DD":null!=b&&(e[ub]=u(b));break;case"Do":null!=b&&(e[ub]=u(parseInt(b,10)));break;case"DDD":case"DDDD":null!=b&&(c._dayOfYear=u(b));break;case"YY":e[sb]=mb.parseTwoDigitYear(b);break;case"YYYY":case"YYYYY":case"YYYYYY":e[sb]=u(b);break;case"a":case"A":c._isPm=F(c._l).isPM(b);break;case"H":case"HH":case"h":case"hh":e[vb]=u(b);break;case"m":case"mm":e[wb]=u(b);break;case"s":case"ss":e[xb]=u(b);break;case"S":case"SS":case"SSS":case"SSSS":e[yb]=u(1e3*("0."+b));break;case"X":c._d=new Date(1e3*parseFloat(b));break;case"Z":case"ZZ":c._useUTC=!0,c._tzm=L(b);break;case"dd":case"ddd":case"dddd":d=F(c._l).weekdaysParse(b),null!=d?(c._w=c._w||{},c._w.d=d):c._pf.invalidWeekday=b;break;case"w":case"ww":case"W":case"WW":case"d":case"e":case"E":a=a.substr(0,1);case"gggg":case"GGGG":case"GGGGG":a=a.substr(0,2),b&&(c._w=c._w||{},c._w[a]=u(b));break;case"gg":case"GG":c._w=c._w||{},c._w[a]=mb.parseTwoDigitYear(b)}}function N(a){var c,d,e,f,g,h,i,j;c=a._w,null!=c.GG||null!=c.W||null!=c.E?(g=1,h=4,d=b(c.GG,a._a[sb],bb(mb(),1,4).year),e=b(c.W,1),f=b(c.E,1)):(j=F(a._l),g=j._week.dow,h=j._week.doy,d=b(c.gg,a._a[sb],bb(mb(),g,h).year),e=b(c.w,1),null!=c.d?(f=c.d,g>f&&++e):f=null!=c.e?c.e+g:g),i=cb(d,e,f,h,g),a._a[sb]=i.year,a._dayOfYear=i.dayOfYear}function O(a){var c,d,e,f,g=[];if(!a._d){for(e=Q(a),a._w&&null==a._a[ub]&&null==a._a[tb]&&N(a),a._dayOfYear&&(f=b(a._a[sb],e[sb]),a._dayOfYear>x(f)&&(a._pf._overflowDayOfYear=!0),d=Z(f,0,a._dayOfYear),a._a[tb]=d.getUTCMonth(),a._a[ub]=d.getUTCDate()),c=0;3>c&&null==a._a[c];++c)a._a[c]=g[c]=e[c];for(;7>c;c++)a._a[c]=g[c]=null==a._a[c]?2===c?1:0:a._a[c];a._d=(a._useUTC?Z:Y).apply(null,g),null!=a._tzm&&a._d.setUTCMinutes(a._d.getUTCMinutes()+a._tzm)}}function P(a){var b;a._d||(b=s(a._i),a._a=[b.year,b.month,b.day,b.hour,b.minute,b.second,b.millisecond],O(a))}function Q(a){var b=new Date;return a._useUTC?[b.getUTCFullYear(),b.getUTCMonth(),b.getUTCDate()]:[b.getFullYear(),b.getMonth(),b.getDate()]}function R(a){if(a._f===mb.ISO_8601)return void V(a);a._a=[],a._pf.empty=!0;var b,c,d,e,f,g=F(a._l),h=""+a._i,i=h.length,j=0;for(d=J(a._f,g).match(Fb)||[],b=0;b<d.length;b++)e=d[b],c=(h.match(K(e,a))||[])[0],c&&(f=h.substr(0,h.indexOf(c)),f.length>0&&a._pf.unusedInput.push(f),h=h.slice(h.indexOf(c)+c.length),j+=c.length),hc[e]?(c?a._pf.empty=!1:a._pf.unusedTokens.push(e),M(e,c,a)):a._strict&&!c&&a._pf.unusedTokens.push(e);a._pf.charsLeftOver=i-j,h.length>0&&a._pf.unusedInput.push(h),a._isPm&&a._a[vb]<12&&(a._a[vb]+=12),a._isPm===!1&&12===a._a[vb]&&(a._a[vb]=0),O(a),z(a)}function S(a){return a.replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g,function(a,b,c,d,e){return b||c||d||e})}function T(a){return a.replace(/[-\/\\^$*+?.()|[\]{}]/g,"\\$&")}function U(a){var b,d,e,f,g;if(0===a._f.length)return a._pf.invalidFormat=!0,void(a._d=new Date(0/0));for(f=0;f<a._f.length;f++)g=0,b=j({},a),b._pf=c(),b._f=a._f[f],R(b),A(b)&&(g+=b._pf.charsLeftOver,g+=10*b._pf.unusedTokens.length,b._pf.score=g,(null==e||e>g)&&(e=g,d=b));j(a,d||b)}function V(a){var b,c,d=a._i,e=Xb.exec(d);if(e){for(a._pf.iso=!0,b=0,c=Zb.length;c>b;b++)if(Zb[b][1].exec(d)){a._f=Zb[b][0]+(e[6]||" ");break}for(b=0,c=$b.length;c>b;b++)if($b[b][1].exec(d)){a._f+=$b[b][0];break}d.match(Nb)&&(a._f+="Z"),R(a)}else a._isValid=!1}function W(a){V(a),a._isValid===!1&&(delete a._isValid,mb.createFromInputFallback(a))}function X(b){var c=b._i,d=Cb.exec(c);c===a?b._d=new Date:d?b._d=new Date(+d[1]):"string"==typeof c?W(b):o(c)?(b._a=c.slice(0),O(b)):p(c)?b._d=new Date(+c):"object"==typeof c?P(b):"number"==typeof c?b._d=new Date(c):mb.createFromInputFallback(b)}function Y(a,b,c,d,e,f,g){var h=new Date(a,b,c,d,e,f,g);return 1970>a&&h.setFullYear(a),h}function Z(a){var b=new Date(Date.UTC.apply(null,arguments));return 1970>a&&b.setUTCFullYear(a),b}function $(a,b){if("string"==typeof a)if(isNaN(a)){if(a=b.weekdaysParse(a),"number"!=typeof a)return null}else a=parseInt(a,10);return a}function _(a,b,c,d,e){return e.relativeTime(b||1,!!c,a,d)}function ab(a,b,c){var d=rb(Math.abs(a)/1e3),e=rb(d/60),f=rb(e/60),g=rb(f/24),h=rb(g/365),i=d<ec.s&&["s",d]||1===e&&["m"]||e<ec.m&&["mm",e]||1===f&&["h"]||f<ec.h&&["hh",f]||1===g&&["d"]||g<=ec.dd&&["dd",g]||g<=ec.dm&&["M"]||g<ec.dy&&["MM",rb(g/30)]||1===h&&["y"]||["yy",h];return i[2]=b,i[3]=a>0,i[4]=c,_.apply({},i)}function bb(a,b,c){var d,e=c-b,f=c-a.day();return f>e&&(f-=7),e-7>f&&(f+=7),d=mb(a).add("d",f),{week:Math.ceil(d.dayOfYear()/7),year:d.year()}}function cb(a,b,c,d,e){var f,g,h=Z(a,0,1).getUTCDay();return h=0===h?7:h,c=null!=c?c:e,f=e-h+(h>d?7:0)-(e>h?7:0),g=7*(b-1)+(c-e)+f+1,{year:g>0?a:a-1,dayOfYear:g>0?g:x(a-1)+g}}function db(b){var c=b._i,d=b._f;return null===c||d===a&&""===c?mb.invalid({nullInput:!0}):("string"==typeof c&&(b._i=c=F().preparse(c)),mb.isMoment(c)?(b=k(c),b._d=new Date(+c._d)):d?o(d)?U(b):R(b):X(b),new h(b))}function eb(a,b){var c,d;if(1===b.length&&o(b[0])&&(b=b[0]),!b.length)return mb();for(c=b[0],d=1;d<b.length;++d)b[d][a](c)&&(c=b[d]);return c}function fb(a,b){var c;return"string"==typeof b&&(b=a.lang().monthsParse(b),"number"!=typeof b)?a:(c=Math.min(a.date(),v(a.year(),b)),a._d["set"+(a._isUTC?"UTC":"")+"Month"](b,c),a)}function gb(a,b){return a._d["get"+(a._isUTC?"UTC":"")+b]()}function hb(a,b,c){return"Month"===b?fb(a,c):a._d["set"+(a._isUTC?"UTC":"")+b](c)}function ib(a,b){return function(c){return null!=c?(hb(this,a,c),mb.updateOffset(this,b),this):gb(this,a)}}function jb(a){mb.duration.fn[a]=function(){return this._data[a]}}function kb(a,b){mb.duration.fn["as"+a]=function(){return+this/b}}function lb(a){"undefined"==typeof ender&&(nb=qb.moment,qb.moment=a?d("Accessing Moment through the global scope is deprecated, and will be removed in an upcoming release.",mb):mb)}for(var mb,nb,ob,pb="2.7.0",qb="undefined"!=typeof global?global:this,rb=Math.round,sb=0,tb=1,ub=2,vb=3,wb=4,xb=5,yb=6,zb={},Ab={_isAMomentObject:null,_i:null,_f:null,_l:null,_strict:null,_tzm:null,_isUTC:null,_offset:null,_pf:null,_lang:null},Bb="undefined"!=typeof module&&module.exports,Cb=/^\/?Date\((\-?\d+)/i,Db=/(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/,Eb=/^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/,Fb=/(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Q|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,4}|X|zz?|ZZ?|.)/g,Gb=/(\[[^\[]*\])|(\\)?(LT|LL?L?L?|l{1,4})/g,Hb=/\d\d?/,Ib=/\d{1,3}/,Jb=/\d{1,4}/,Kb=/[+\-]?\d{1,6}/,Lb=/\d+/,Mb=/[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i,Nb=/Z|[\+\-]\d\d:?\d\d/gi,Ob=/T/i,Pb=/[\+\-]?\d+(\.\d{1,3})?/,Qb=/\d{1,2}/,Rb=/\d/,Sb=/\d\d/,Tb=/\d{3}/,Ub=/\d{4}/,Vb=/[+-]?\d{6}/,Wb=/[+-]?\d+/,Xb=/^\s*(?:[+-]\d{6}|\d{4})-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,Yb="YYYY-MM-DDTHH:mm:ssZ",Zb=[["YYYYYY-MM-DD",/[+-]\d{6}-\d{2}-\d{2}/],["YYYY-MM-DD",/\d{4}-\d{2}-\d{2}/],["GGGG-[W]WW-E",/\d{4}-W\d{2}-\d/],["GGGG-[W]WW",/\d{4}-W\d{2}/],["YYYY-DDD",/\d{4}-\d{3}/]],$b=[["HH:mm:ss.SSSS",/(T| )\d\d:\d\d:\d\d\.\d+/],["HH:mm:ss",/(T| )\d\d:\d\d:\d\d/],["HH:mm",/(T| )\d\d:\d\d/],["HH",/(T| )\d\d/]],_b=/([\+\-]|\d\d)/gi,ac=("Date|Hours|Minutes|Seconds|Milliseconds".split("|"),{Milliseconds:1,Seconds:1e3,Minutes:6e4,Hours:36e5,Days:864e5,Months:2592e6,Years:31536e6}),bc={ms:"millisecond",s:"second",m:"minute",h:"hour",d:"day",D:"date",w:"week",W:"isoWeek",M:"month",Q:"quarter",y:"year",DDD:"dayOfYear",e:"weekday",E:"isoWeekday",gg:"weekYear",GG:"isoWeekYear"},cc={dayofyear:"dayOfYear",isoweekday:"isoWeekday",isoweek:"isoWeek",weekyear:"weekYear",isoweekyear:"isoWeekYear"},dc={},ec={s:45,m:45,h:22,dd:25,dm:45,dy:345},fc="DDD w W M D d".split(" "),gc="M D H h m s w W".split(" "),hc={M:function(){return this.month()+1},MMM:function(a){return this.lang().monthsShort(this,a)},MMMM:function(a){return this.lang().months(this,a)},D:function(){return this.date()},DDD:function(){return this.dayOfYear()},d:function(){return this.day()},dd:function(a){return this.lang().weekdaysMin(this,a)},ddd:function(a){return this.lang().weekdaysShort(this,a)},dddd:function(a){return this.lang().weekdays(this,a)},w:function(){return this.week()},W:function(){return this.isoWeek()},YY:function(){return m(this.year()%100,2)},YYYY:function(){return m(this.year(),4)},YYYYY:function(){return m(this.year(),5)},YYYYYY:function(){var a=this.year(),b=a>=0?"+":"-";return b+m(Math.abs(a),6)},gg:function(){return m(this.weekYear()%100,2)},gggg:function(){return m(this.weekYear(),4)},ggggg:function(){return m(this.weekYear(),5)},GG:function(){return m(this.isoWeekYear()%100,2)},GGGG:function(){return m(this.isoWeekYear(),4)},GGGGG:function(){return m(this.isoWeekYear(),5)},e:function(){return this.weekday()},E:function(){return this.isoWeekday()},a:function(){return this.lang().meridiem(this.hours(),this.minutes(),!0)},A:function(){return this.lang().meridiem(this.hours(),this.minutes(),!1)},H:function(){return this.hours()},h:function(){return this.hours()%12||12},m:function(){return this.minutes()},s:function(){return this.seconds()},S:function(){return u(this.milliseconds()/100)},SS:function(){return m(u(this.milliseconds()/10),2)},SSS:function(){return m(this.milliseconds(),3)},SSSS:function(){return m(this.milliseconds(),3)},Z:function(){var a=-this.zone(),b="+";return 0>a&&(a=-a,b="-"),b+m(u(a/60),2)+":"+m(u(a)%60,2)},ZZ:function(){var a=-this.zone(),b="+";return 0>a&&(a=-a,b="-"),b+m(u(a/60),2)+m(u(a)%60,2)},z:function(){return this.zoneAbbr()},zz:function(){return this.zoneName()},X:function(){return this.unix()},Q:function(){return this.quarter()}},ic=["months","monthsShort","weekdays","weekdaysShort","weekdaysMin"];fc.length;)ob=fc.pop(),hc[ob+"o"]=f(hc[ob],ob);for(;gc.length;)ob=gc.pop(),hc[ob+ob]=e(hc[ob],2);for(hc.DDDD=e(hc.DDD,3),j(g.prototype,{set:function(a){var b,c;for(c in a)b=a[c],"function"==typeof b?this[c]=b:this["_"+c]=b},_months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),months:function(a){return this._months[a.month()]},_monthsShort:"Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),monthsShort:function(a){return this._monthsShort[a.month()]},monthsParse:function(a){var b,c,d;for(this._monthsParse||(this._monthsParse=[]),b=0;12>b;b++)if(this._monthsParse[b]||(c=mb.utc([2e3,b]),d="^"+this.months(c,"")+"|^"+this.monthsShort(c,""),this._monthsParse[b]=new RegExp(d.replace(".",""),"i")),this._monthsParse[b].test(a))return b},_weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),weekdays:function(a){return this._weekdays[a.day()]},_weekdaysShort:"Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),weekdaysShort:function(a){return this._weekdaysShort[a.day()]},_weekdaysMin:"Su_Mo_Tu_We_Th_Fr_Sa".split("_"),weekdaysMin:function(a){return this._weekdaysMin[a.day()]},weekdaysParse:function(a){var b,c,d;for(this._weekdaysParse||(this._weekdaysParse=[]),b=0;7>b;b++)if(this._weekdaysParse[b]||(c=mb([2e3,1]).day(b),d="^"+this.weekdays(c,"")+"|^"+this.weekdaysShort(c,"")+"|^"+this.weekdaysMin(c,""),this._weekdaysParse[b]=new RegExp(d.replace(".",""),"i")),this._weekdaysParse[b].test(a))return b},_longDateFormat:{LT:"h:mm A",L:"MM/DD/YYYY",LL:"MMMM D YYYY",LLL:"MMMM D YYYY LT",LLLL:"dddd, MMMM D YYYY LT"},longDateFormat:function(a){var b=this._longDateFormat[a];return!b&&this._longDateFormat[a.toUpperCase()]&&(b=this._longDateFormat[a.toUpperCase()].replace(/MMMM|MM|DD|dddd/g,function(a){return a.slice(1)}),this._longDateFormat[a]=b),b},isPM:function(a){return"p"===(a+"").toLowerCase().charAt(0)},_meridiemParse:/[ap]\.?m?\.?/i,meridiem:function(a,b,c){return a>11?c?"pm":"PM":c?"am":"AM"},_calendar:{sameDay:"[Today at] LT",nextDay:"[Tomorrow at] LT",nextWeek:"dddd [at] LT",lastDay:"[Yesterday at] LT",lastWeek:"[Last] dddd [at] LT",sameElse:"L"},calendar:function(a,b){var c=this._calendar[a];return"function"==typeof c?c.apply(b):c},_relativeTime:{future:"in %s",past:"%s ago",s:"a few seconds",m:"a minute",mm:"%d minutes",h:"an hour",hh:"%d hours",d:"a day",dd:"%d days",M:"a month",MM:"%d months",y:"a year",yy:"%d years"},relativeTime:function(a,b,c,d){var e=this._relativeTime[c];return"function"==typeof e?e(a,b,c,d):e.replace(/%d/i,a)},pastFuture:function(a,b){var c=this._relativeTime[a>0?"future":"past"];return"function"==typeof c?c(b):c.replace(/%s/i,b)},ordinal:function(a){return this._ordinal.replace("%d",a)},_ordinal:"%d",preparse:function(a){return a},postformat:function(a){return a},week:function(a){return bb(a,this._week.dow,this._week.doy).week},_week:{dow:0,doy:6},_invalidDate:"Invalid date",invalidDate:function(){return this._invalidDate}}),mb=function(b,d,e,f){var g;return"boolean"==typeof e&&(f=e,e=a),g={},g._isAMomentObject=!0,g._i=b,g._f=d,g._l=e,g._strict=f,g._isUTC=!1,g._pf=c(),db(g)},mb.suppressDeprecationWarnings=!1,mb.createFromInputFallback=d("moment construction falls back to js Date. This is discouraged and will be removed in upcoming major release. Please refer to https://github.com/moment/moment/issues/1407 for more info.",function(a){a._d=new Date(a._i)}),mb.min=function(){var a=[].slice.call(arguments,0);return eb("isBefore",a)},mb.max=function(){var a=[].slice.call(arguments,0);return eb("isAfter",a)},mb.utc=function(b,d,e,f){var g;return"boolean"==typeof e&&(f=e,e=a),g={},g._isAMomentObject=!0,g._useUTC=!0,g._isUTC=!0,g._l=e,g._i=b,g._f=d,g._strict=f,g._pf=c(),db(g).utc()},mb.unix=function(a){return mb(1e3*a)},mb.duration=function(a,b){var c,d,e,f=a,g=null;return mb.isDuration(a)?f={ms:a._milliseconds,d:a._days,M:a._months}:"number"==typeof a?(f={},b?f[b]=a:f.milliseconds=a):(g=Db.exec(a))?(c="-"===g[1]?-1:1,f={y:0,d:u(g[ub])*c,h:u(g[vb])*c,m:u(g[wb])*c,s:u(g[xb])*c,ms:u(g[yb])*c}):(g=Eb.exec(a))&&(c="-"===g[1]?-1:1,e=function(a){var b=a&&parseFloat(a.replace(",","."));return(isNaN(b)?0:b)*c},f={y:e(g[2]),M:e(g[3]),d:e(g[4]),h:e(g[5]),m:e(g[6]),s:e(g[7]),w:e(g[8])}),d=new i(f),mb.isDuration(a)&&a.hasOwnProperty("_lang")&&(d._lang=a._lang),d},mb.version=pb,mb.defaultFormat=Yb,mb.ISO_8601=function(){},mb.momentProperties=Ab,mb.updateOffset=function(){},mb.relativeTimeThreshold=function(b,c){return ec[b]===a?!1:(ec[b]=c,!0)},mb.lang=function(a,b){var c;return a?(b?D(B(a),b):null===b?(E(a),a="en"):zb[a]||F(a),c=mb.duration.fn._lang=mb.fn._lang=F(a),c._abbr):mb.fn._lang._abbr},mb.langData=function(a){return a&&a._lang&&a._lang._abbr&&(a=a._lang._abbr),F(a)},mb.isMoment=function(a){return a instanceof h||null!=a&&a.hasOwnProperty("_isAMomentObject")},mb.isDuration=function(a){return a instanceof i},ob=ic.length-1;ob>=0;--ob)t(ic[ob]);mb.normalizeUnits=function(a){return r(a)},mb.invalid=function(a){var b=mb.utc(0/0);return null!=a?j(b._pf,a):b._pf.userInvalidated=!0,b},mb.parseZone=function(){return mb.apply(null,arguments).parseZone()},mb.parseTwoDigitYear=function(a){return u(a)+(u(a)>68?1900:2e3)},j(mb.fn=h.prototype,{clone:function(){return mb(this)},valueOf:function(){return+this._d+6e4*(this._offset||0)},unix:function(){return Math.floor(+this/1e3)},toString:function(){return this.clone().lang("en").format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ")},toDate:function(){return this._offset?new Date(+this):this._d},toISOString:function(){var a=mb(this).utc();return 0<a.year()&&a.year()<=9999?I(a,"YYYY-MM-DD[T]HH:mm:ss.SSS[Z]"):I(a,"YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]")},toArray:function(){var a=this;return[a.year(),a.month(),a.date(),a.hours(),a.minutes(),a.seconds(),a.milliseconds()]},isValid:function(){return A(this)},isDSTShifted:function(){return this._a?this.isValid()&&q(this._a,(this._isUTC?mb.utc(this._a):mb(this._a)).toArray())>0:!1},parsingFlags:function(){return j({},this._pf)},invalidAt:function(){return this._pf.overflow},utc:function(){return this.zone(0)},local:function(){return this.zone(0),this._isUTC=!1,this},format:function(a){var b=I(this,a||mb.defaultFormat);return this.lang().postformat(b)},add:function(a,b){var c;return c="string"==typeof a&&"string"==typeof b?mb.duration(isNaN(+b)?+a:+b,isNaN(+b)?b:a):"string"==typeof a?mb.duration(+b,a):mb.duration(a,b),n(this,c,1),this},subtract:function(a,b){var c;return c="string"==typeof a&&"string"==typeof b?mb.duration(isNaN(+b)?+a:+b,isNaN(+b)?b:a):"string"==typeof a?mb.duration(+b,a):mb.duration(a,b),n(this,c,-1),this},diff:function(a,b,c){var d,e,f=C(a,this),g=6e4*(this.zone()-f.zone());return b=r(b),"year"===b||"month"===b?(d=432e5*(this.daysInMonth()+f.daysInMonth()),e=12*(this.year()-f.year())+(this.month()-f.month()),e+=(this-mb(this).startOf("month")-(f-mb(f).startOf("month")))/d,e-=6e4*(this.zone()-mb(this).startOf("month").zone()-(f.zone()-mb(f).startOf("month").zone()))/d,"year"===b&&(e/=12)):(d=this-f,e="second"===b?d/1e3:"minute"===b?d/6e4:"hour"===b?d/36e5:"day"===b?(d-g)/864e5:"week"===b?(d-g)/6048e5:d),c?e:l(e)},from:function(a,b){return mb.duration(this.diff(a)).lang(this.lang()._abbr).humanize(!b)},fromNow:function(a){return this.from(mb(),a)},calendar:function(a){var b=a||mb(),c=C(b,this).startOf("day"),d=this.diff(c,"days",!0),e=-6>d?"sameElse":-1>d?"lastWeek":0>d?"lastDay":1>d?"sameDay":2>d?"nextDay":7>d?"nextWeek":"sameElse";return this.format(this.lang().calendar(e,this))},isLeapYear:function(){return y(this.year())},isDST:function(){return this.zone()<this.clone().month(0).zone()||this.zone()<this.clone().month(5).zone()},day:function(a){var b=this._isUTC?this._d.getUTCDay():this._d.getDay();return null!=a?(a=$(a,this.lang()),this.add({d:a-b})):b},month:ib("Month",!0),startOf:function(a){switch(a=r(a)){case"year":this.month(0);case"quarter":case"month":this.date(1);case"week":case"isoWeek":case"day":this.hours(0);case"hour":this.minutes(0);case"minute":this.seconds(0);case"second":this.milliseconds(0)}return"week"===a?this.weekday(0):"isoWeek"===a&&this.isoWeekday(1),"quarter"===a&&this.month(3*Math.floor(this.month()/3)),this},endOf:function(a){return a=r(a),this.startOf(a).add("isoWeek"===a?"week":a,1).subtract("ms",1)},isAfter:function(a,b){return b="undefined"!=typeof b?b:"millisecond",+this.clone().startOf(b)>+mb(a).startOf(b)},isBefore:function(a,b){return b="undefined"!=typeof b?b:"millisecond",+this.clone().startOf(b)<+mb(a).startOf(b)},isSame:function(a,b){return b=b||"ms",+this.clone().startOf(b)===+C(a,this).startOf(b)},min:d("moment().min is deprecated, use moment.min instead. https://github.com/moment/moment/issues/1548",function(a){return a=mb.apply(null,arguments),this>a?this:a}),max:d("moment().max is deprecated, use moment.max instead. https://github.com/moment/moment/issues/1548",function(a){return a=mb.apply(null,arguments),a>this?this:a}),zone:function(a,b){var c=this._offset||0;return null==a?this._isUTC?c:this._d.getTimezoneOffset():("string"==typeof a&&(a=L(a)),Math.abs(a)<16&&(a=60*a),this._offset=a,this._isUTC=!0,c!==a&&(!b||this._changeInProgress?n(this,mb.duration(c-a,"m"),1,!1):this._changeInProgress||(this._changeInProgress=!0,mb.updateOffset(this,!0),this._changeInProgress=null)),this)},zoneAbbr:function(){return this._isUTC?"UTC":""},zoneName:function(){return this._isUTC?"Coordinated Universal Time":""},parseZone:function(){return this._tzm?this.zone(this._tzm):"string"==typeof this._i&&this.zone(this._i),this},hasAlignedHourOffset:function(a){return a=a?mb(a).zone():0,(this.zone()-a)%60===0},daysInMonth:function(){return v(this.year(),this.month())},dayOfYear:function(a){var b=rb((mb(this).startOf("day")-mb(this).startOf("year"))/864e5)+1;return null==a?b:this.add("d",a-b)},quarter:function(a){return null==a?Math.ceil((this.month()+1)/3):this.month(3*(a-1)+this.month()%3)},weekYear:function(a){var b=bb(this,this.lang()._week.dow,this.lang()._week.doy).year;return null==a?b:this.add("y",a-b)},isoWeekYear:function(a){var b=bb(this,1,4).year;return null==a?b:this.add("y",a-b)},week:function(a){var b=this.lang().week(this);return null==a?b:this.add("d",7*(a-b))},isoWeek:function(a){var b=bb(this,1,4).week;return null==a?b:this.add("d",7*(a-b))},weekday:function(a){var b=(this.day()+7-this.lang()._week.dow)%7;return null==a?b:this.add("d",a-b)},isoWeekday:function(a){return null==a?this.day()||7:this.day(this.day()%7?a:a-7)},isoWeeksInYear:function(){return w(this.year(),1,4)},weeksInYear:function(){var a=this._lang._week;return w(this.year(),a.dow,a.doy)},get:function(a){return a=r(a),this[a]()},set:function(a,b){return a=r(a),"function"==typeof this[a]&&this[a](b),this},lang:function(b){return b===a?this._lang:(this._lang=F(b),this)}}),mb.fn.millisecond=mb.fn.milliseconds=ib("Milliseconds",!1),mb.fn.second=mb.fn.seconds=ib("Seconds",!1),mb.fn.minute=mb.fn.minutes=ib("Minutes",!1),mb.fn.hour=mb.fn.hours=ib("Hours",!0),mb.fn.date=ib("Date",!0),mb.fn.dates=d("dates accessor is deprecated. Use date instead.",ib("Date",!0)),mb.fn.year=ib("FullYear",!0),mb.fn.years=d("years accessor is deprecated. Use year instead.",ib("FullYear",!0)),mb.fn.days=mb.fn.day,mb.fn.months=mb.fn.month,mb.fn.weeks=mb.fn.week,mb.fn.isoWeeks=mb.fn.isoWeek,mb.fn.quarters=mb.fn.quarter,mb.fn.toJSON=mb.fn.toISOString,j(mb.duration.fn=i.prototype,{_bubble:function(){var a,b,c,d,e=this._milliseconds,f=this._days,g=this._months,h=this._data;h.milliseconds=e%1e3,a=l(e/1e3),h.seconds=a%60,b=l(a/60),h.minutes=b%60,c=l(b/60),h.hours=c%24,f+=l(c/24),h.days=f%30,g+=l(f/30),h.months=g%12,d=l(g/12),h.years=d},weeks:function(){return l(this.days()/7)},valueOf:function(){return this._milliseconds+864e5*this._days+this._months%12*2592e6+31536e6*u(this._months/12)},humanize:function(a){var b=+this,c=ab(b,!a,this.lang());return a&&(c=this.lang().pastFuture(b,c)),this.lang().postformat(c)},add:function(a,b){var c=mb.duration(a,b);return this._milliseconds+=c._milliseconds,this._days+=c._days,this._months+=c._months,this._bubble(),this},subtract:function(a,b){var c=mb.duration(a,b);return this._milliseconds-=c._milliseconds,this._days-=c._days,this._months-=c._months,this._bubble(),this},get:function(a){return a=r(a),this[a.toLowerCase()+"s"]()},as:function(a){return a=r(a),this["as"+a.charAt(0).toUpperCase()+a.slice(1)+"s"]()},lang:mb.fn.lang,toIsoString:function(){var a=Math.abs(this.years()),b=Math.abs(this.months()),c=Math.abs(this.days()),d=Math.abs(this.hours()),e=Math.abs(this.minutes()),f=Math.abs(this.seconds()+this.milliseconds()/1e3);return this.asSeconds()?(this.asSeconds()<0?"-":"")+"P"+(a?a+"Y":"")+(b?b+"M":"")+(c?c+"D":"")+(d||e||f?"T":"")+(d?d+"H":"")+(e?e+"M":"")+(f?f+"S":""):"P0D"}});for(ob in ac)ac.hasOwnProperty(ob)&&(kb(ob,ac[ob]),jb(ob.toLowerCase()));kb("Weeks",6048e5),mb.duration.fn.asMonths=function(){return(+this-31536e6*this.years())/2592e6+12*this.years()},mb.lang("en",{ordinal:function(a){var b=a%10,c=1===u(a%100/10)?"th":1===b?"st":2===b?"nd":3===b?"rd":"th";return a+c}}),Bb?module.exports=mb:"function"==typeof define&&define.amd?(define("moment",function(a,b,c){return c.config&&c.config()&&c.config().noGlobal===!0&&(qb.moment=nb),mb}),lb(!0)):lb()}).call(this);