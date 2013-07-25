// Generously provided by  Nico Disseldorp: http://sciencevsmagic.net/geo/

var geo = (function () {
  var module = {},
  ctx,
  points=[],
  lines=[],
  arcs=[],
  lastpoint,
  zoom=1,
  offsetx=0,
  offsety=0,
  keyheld= {},
  changes=[];
  
  changes.unchanges=[];
  changes.unchanges.jumps=[];
  changes.jumps=[];
  
  module.init = function () {
    geo.c=document.getElementById("maincanvas");
    geo.d=document.getElementById("clonecanvas");
    ctx=geo.c.getContext("2d");
    dtx=geo.d.getContext("2d");
    
    geo.lighter="#dddddd";
    geo.grey="#bbbbbb";
    geo.medium="#777777";
    geo.dark="#333333";
    geo.black="#000000";
    geo.drawblack="#000000";
    
    
    window.requestAnimFrame = (function(){
      return window.requestAnimationFrame ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame ||
      function( callback ){
        window.setTimeout(callback, 1000 / 60);
      };
    }());
    
    intersectswanted=false;
    keyheld.shift=false;
    
    module.fixsize()
    //we need two dots to start
    
    changes.jumps[0]=0;
    changes.unchanges.jumps[0]=0;
    offsetx = geo.wwidth/2;
    offsety = geo.wheight/2;
    pointat({x: -256, y: 0, free:2});
    pointat({x: 256, y: 0, free:2});
    changes.record();
    geo.test.innit();
    
    if (window.location.hash != 0){
      geo.loadhash();
    }
    geo.test.update();
    geo.test.updatepoints();
  };
  
  var redrawall = function (){
    ctx.clearRect(0,0,geo.c.width,geo.c.height);
    var i;
    ctx.fillStyle=geo.medium;
    for (i=0; i < geo.test.challenges.length; i++){
      if (geo.test.challenges[i].active) {
        geo.test.challenges[i].highlight();
      }
    }
    ctx.fillStyle=geo.black;
    ctx.strokeStyle=geo.grey;
    for (i=0; i < lines.length; i++){
      if (lines[i].color === geo.grey) {
        lines[i].draw();
      }
    }
    for (i=0; i < arcs.length; i++){
      if (arcs[i].color === geo.grey) {
        arcs[i].draw();
      }
    }
    ctx.strokeStyle=geo.drawblack;
    for (i=0; i < lines.length; i++){
      if (lines[i].color === geo.black) {
        lines[i].draw();
      }
    }
    for (i=0; i < arcs.length; i++){
      if (arcs[i].color === geo.black) {
        arcs[i].draw();
      }
    }
    for (i=0; i < points.length; i++){
      points[i].draw();
    }
    redrawd();
  };
  
  var redrawd = function (){
    //i'm prett sure that everything on the d layer is done here
    var i;
    dtx.clearRect(0,0,geo.d.width,geo.d.height);
    if (lastpoint!=undefined){
      var lastpointxy = getdrawxy({x:lastpoint.x,y:lastpoint.y});
      var endxy;
      if (currentmouse.under){
        //get the position of the point under the mouse
        endxy = getdrawxy({x:currentmouse.under.x,y:currentmouse.under.y});
      }
      else {
        //use the mouseposition
        endxy = {x:currentmouse.x,y:currentmouse.y};
      }
      //preview of lines/arcs to be drawn
      if (currentmouse.under){
        //a valid line
        dtx.strokeStyle=geo.dark;
        dtx.beginPath();
        dtx.moveTo(lastpointxy.x,lastpointxy.y);
        dtx.lineTo(endxy.x,endxy.y);
        dtx.stroke();
        dtx.strokeStyle=geo.medium;
      }
      else if (currentmouse.edge){
        //a valid circle
        dtx.strokeStyle=geo.dark;
        dtx.beginPath();
        dtx.arc(lastpointxy.x, lastpointxy.y, currentmouse.radius*zoom,Math.PI*2,false);
        dtx.stroke();
        dtx.strokeStyle=geo.medium;
      }
      else {
        //neither
        dtx.beginPath();
        dtx.arc(lastpointxy.x, lastpointxy.y, currentmouse.radius*zoom,Math.PI*2,false);
        dtx.stroke();
        
        dtx.beginPath();
        dtx.moveTo(lastpointxy.x,lastpointxy.y);
        dtx.lineTo(endxy.x,endxy.y);
        dtx.stroke();
      }
      lastpoint.highlight();
    }
    if (currentmouse.under){
      currentmouse.under.highlight();
    }
    else if (currentmouse.edge){
      for (i=0; i < currentmouse.edges.length; i++){
        currentmouse.edges[i].point.highlight();
      }
    }
  };
  
  module.resetall = function (){
    //this is a really hacky way of resetting, but it works.
    //TODO:fix it so it can both preserve redos and restore the original two points.
    while (changes.jumps.length>2){
      changes.undo();
      }
    //changes.jumps[0]=0;
    zoomcount=-4;
    zoom=Math.pow(1.25,zoomcount);
    offsetx=geo.wwidth/2;
    offsety=geo.wheight/2;
    currentmouse.update();
    //geo.test.update();
    redrawall();
  };
  
  module.fixsize = function(){
    offsetx-=geo.wwidth/2;
    offsety-=geo.wheight/2;
    geo.wwidth= window.innerWidth;
    geo.wheight= window.innerHeight;
    offsetx+=geo.wwidth/2;
    offsety+=geo.wheight/2;
    
    geo.c.width=geo.wwidth;
    geo.c.height=geo.wheight;
    geo.d.width=geo.wwidth;
    geo.d.height=geo.wheight;
    
    ctx.fillStyle=geo.black;
    ctx.strokeStyle = geo.black;
    ctx.lineWidth =1;
    dtx.fillStyle=geo.medium;
    dtx.strokeStyle = geo.medium;
    dtx.lineWidth =1;
    
    document.getElementById("scrollbox").style.maxHeight = geo.wheight/2+"px";
    
    redrawall();
  }
  
  var deselect = function (){
    lastpoint=undefined;
    var i;
    for (i=0; i<points.length; i++){
      if (points[i].floating === 2){
        points[i].floating = 1;
      }
    }
    if (!currentmouse.under){
    intersectswanted=false;
    }
    redrawall();
  }
  
  var select = function (point){
    geo.test.clear();
    if (lastpoint){
      deselect();
    }
    lastpoint=point;
    lastpoint.highlight();
    //if the point is on a line, add the floats
    var i;
    for (i=0; i < lines.length; i++){
      if (lastpoint.online(lines[i])){
        lines[i].addfloats();
      }
    }
  }
  
  points.check = function (x,y,tolerence,user){
    var i;
    var distance;
    var closest = {point:null, distance: tolerence};
    for (i=0; i < points.length; i++){
      if (!user || points[i].floating!==1){
        //i don't want to return floating 1s that the user is hovering over.
        distance = Math.max(Math.abs(x - points[i].x),Math.abs(y - points[i].y));
        if (distance < closest.distance){
          closest = {point: points[i], distance: distance};
        }
      }
    }
    return closest.point;
  };
  
  var pointat = function (spec, tolerence) {
    var tolerence = tolerence || 1;
    //this is a big messy function that finds old points or makes new ones. It does way too much, but I'm not quite sure how to fix it right now.
    if (isFinite(spec.x) && isFinite(spec.x)){
      var under=points.check(spec.x,spec.y,tolerence);
      if (under== undefined) {
        //make a new point
        spec.id = points.length;
        points[points.length] = makepoint (spec);
        under=points[points.length-1];
        //save this point in the chain
        changes[changes.length] = {type:"point", a:spec.x, b:spec.y};
        if (spec.free == 1){
          changes[changes.length] = {type:"free", a:spec.x, b:spec.y};
          under.type="free";
        }
        else if (spec.free == 2){
          //starting points are similiar to free points, but i don't want to save them to the hash.
          changes[changes.length] = {type:"start", a:spec.x, b:spec.y};
          under.type="free";
        }
        under.draw();
      }
      else{
        if (under.floating !==0 && spec.floating ===0){
          under.sink();
        }
      }
      if (spec.sharp){
        under.sharpen();
      }
      return under;
    }
  };
  
  var makepoint = function (spec) {
    var outward = {};
    outward.draw = function () {
      var drawxy = getdrawxy({x:outward.x,y:outward.y});
      if (outward.type ==="free"){
        ctx.beginPath();
        ctx.arc(drawxy.x,drawxy.y, 3,Math.PI*2,false);
        ctx.stroke();
        ctx.fill();
      }
      else if (outward.floating===0) {
        if (intersectswanted){
        ctx.beginPath();
        ctx.arc(drawxy.x,drawxy.y, 2,Math.PI*2,false);
        ctx.stroke();
        }
      }
      else if (outward.floating===2) {
        if (intersectswanted){
        ctx.beginPath();
        ctx.moveTo(drawxy.x-outward.drawvector.x*4,drawxy.y-outward.drawvector.y*4);
        ctx.lineTo(drawxy.x+outward.drawvector.x*4,drawxy.y+outward.drawvector.y*4);
        ctx.stroke();
        }
      }
      //ctx.fillText(outward.id, drawxy.x-5,drawxy.y-5);
    }
    outward.highlight = function () {
      var drawxy = getdrawxy({x:outward.x,y:outward.y});
      dtx.beginPath();
      dtx.arc(drawxy.x,drawxy.y, 4,Math.PI*2,false);
      dtx.stroke();
      dtx.fill();
    }
    outward.sink = function(){
      //sink a floating point to become a real one.
      if (this.floating!==0){
        this.floating=0;
        changes[changes.length]= {type:"sink", a:outward.id, b:0};
        return outward;
      }
      else{
        return outward;
      }
    }
    outward.sharpen = function(){
      if (this.sharp!==1){
        this.sharp=1;
        changes[changes.length]= {type:"sharpen", a:outward.id, b:0};
        outward.findsplits();
        return outward;
      }
      else{
        return outward;
      }
    }
    outward.online = function(line){
      if (Math.abs(line.point1.x-line.point2.x)<0.0001&&Math.abs(line.point1.x-this.x)<0.0001){
        return true;
      }
      else if (Math.abs(line.point1.y-line.point2.y)<0.0001&&Math.abs(line.point1.y-this.y)<0.0001){
        return true;
      }
      else{
        var xcheck=(this.x - line.point1.x)/(line.point2.x - line.point1.x);
        var ycheck=(this.y - line.point1.y)/(line.point2.y - line.point1.y);
        if (Math.abs(xcheck-ycheck)<0.001){
          return true;
        }
        else{
          return false;
        }
      }
    }
    outward.inbox = function(line){
      if (Math.max(line.point1.x,line.point2.x,outward.x-0.0001)!==outward.x-0.0001&&
      Math.min(line.point1.x,line.point2.x,outward.x+0.0001)!==outward.x+0.0001){
        if (Math.max(line.point1.y,line.point2.y,outward.y-0.0001)!==outward.y-0.0001&&
        Math.min(line.point1.y,line.point2.y,outward.y+0.0001)!==outward.y+0.0001){
          return true;
        }
      }
      return false;
    }
    outward.onarc = function(centre,radius,tolerence){
      //if (Math.max(Math.abs(centre.x-outward.x),Math.abs(centre.y-outward.y))<radius){
      //  return false;
      //}
      var thisradius=Math.sqrt(Math.pow(centre.x-outward.x,2)+Math.pow(centre.y-outward.y,2));
      var distance = Math.abs(radius-thisradius);
      if (distance<tolerence){
        return ({distance:distance, point:outward, radius:thisradius});
      }
      else {
        return false;
      }
    }
    outward.findsplits = function(){
      var i;
      var existinglines=lines.length;
      for (i=0;i<existinglines;i++){
        lines[i].split(outward);
      }
    }
    
    outward.id = spec.id;
    outward.x = spec.x;
    outward.y = spec.y;
    outward.floating = spec.floating||0;
    outward.sharp=0;
    return outward;
  };
  
  var lineat = function (point1,point2, color,split) {
    var i;
    var fakeline;
    var foundsmaller=false;
    var changesbefore=changes.length;
      
    var checklines = function (){
      var i;
      for (i=0; i < lines.length; i++){
        if ((lines[i].point1 == point1 && lines[i].point2 == point2) || (lines[i].point1 == point2 && lines[i].point2 == point1)){
          return lines[i];
        }
      }
      return null;
    }
    if (point1==point2){
      return;
    }
    //these points need to do their splits before we know if a new line is needed.
    point1.sharpen();
    point2.sharpen();
    var under=checklines();
    if (under===null) {
      point1=point1.sink(0,1);
      point2=point2.sink(0,1);
      //make a fake line to split up.
      fakeline={point1:point1,point2:point2};
      for (i = 0; i < points.length; i++){
        if (points[i]!==point1&&points[i]!==point2&&points[i].sharp&&points[i].online(fakeline)&&points[i].inbox(fakeline)){
          foundsmaller=true;
          under=lineat(point1,points[i],color,true);
          lineat(points[i],point2,color,true);
        }
      }
      if (!foundsmaller){
        //make a line
        lines[lines.length] = makeline(point1,point2, {id:lines.length, color:color});
        under=lines[lines.length-1];
        changes[changes.length] = {type:"realline", a:point1.id, b:point2.id, obj:under};
        var spec;
        for (i = 0; i < lines.length; i++) {
          under.intersects(lines[i]);
        }
        for (i = 0; i < arcs.length; i++) {
          spec=intersectarcline(arcs[i], under);
          if (spec){
            pointat(spec.point1);
            pointat(spec.point2);
          }
        }
        if (color===geo.grey){
          under.color=geo.grey;
        }
        redrawall();
        module.test.line(under);
      }
    }
    else {
      if (under.color === geo.grey){
        under.toggle();
      }
    }
    if (!split && changes.length!==changesbefore){
      changes[changes.length] = {type:"line", a:point1.id, b:point2.id, obj:under};
      module.test.announce();
    }
    return under;
  };
  
  var makeline = function (point1, point2, spec) {
    var outward = {};
    outward.draw = function () {
      var drawxy1 = getdrawxy({x:this.point1.x,y:this.point1.y});
      var drawxy2 = getdrawxy({x:this.point2.x,y:this.point2.y});
      ctx.beginPath();
      ctx.moveTo(drawxy1.x,drawxy1.y);
      ctx.lineTo(drawxy2.x,drawxy2.y);
      ctx.stroke();
    }
    outward.toggle = function (undo){
      if (this.color == geo.grey){
        this.color=geo.black;
      }
      else{
        this.color=geo.grey;
      }
      redrawall();
      if (undo !=1){
        changes[changes.length] = {type:"toggle", a:"line", b:this.id};
      }
    }
    outward.intersects = function (line2,scoring) {
      line1=outward;
      //when scoring, I need to know if touching lines have the same angle
      if ((line1.point1!=line2.point1 &&
        line1.point2!=line2.point1 &&
        line1.point1!=line2.point2 &&
        line1.point2!=line2.point2)||scoring) {
          
        var ax=line1.point1.x;
        var ay=line1.point1.y;
        var bx=line1.point2.x;
        var by=line1.point2.y;
        //vector for line 1
        var rx=ax-bx;
        var ry=ay-by;
        
        var cx=line2.point1.x;
        var cy=line2.point1.y;
        var dx=line2.point2.x;
        var dy=line2.point2.y;
        //vector for line 1
        var sx=cx-dx;
        var sy=cy-dy;
        
        //denominator is the cross product of r*s
        var denominator = (rx)*(sy)-(ry)*(sx);
        
        //scalar for line1
        var t = ((ax-cx)*sy-(ay-cy)*sx)/denominator;
        var u = ((ax-cx)*ry-(ay-cy)*rx)/denominator;
        
        var floating = 0;
        var sharp = 0;
        
        if (Math.abs(denominator)<0.0001){
          //lines are parallel (with some rounding because javascript can be funny)
          if (Math.abs((ax-cx)*(sy)-(ay-cy)*(sx))<0.0001){
            return {result:"co"};
          }
          else{
            return {result:"par"};
          }
        }
        else if (t>1||t<0){
          floating = 1;
        }
        else if (u>1||u<0){
          floating = 1;
        }
        else{
          sharp=1;
        }
        //make the point
        var px = (( (ax*by-ay*bx)*sx - rx*(cx*dy-cy*dx) )/ denominator);
        var py = (( (ax*by-ay*bx)*sy - ry*(cx*dy-cy*dx) )/ denominator);
        var point = pointat({x: px, y: py, floating: floating,sharp:sharp});
        return {result:"int",point:point};
      }
      return {result:"touching"};
    }
    outward.addfloats = function (){
      var i;
      var spec;
      var point1;
      var point2;
      
      for (i = 0; i < lines.length; i++) {
        spec = outward.intersects(lines[i]);
        if (spec.result==="int" && spec.point.floating===1){
          //i probably shouldn't use the spec var twice for different things
          if (spec.point.floating ===1){
            spec.point.floating = 2;
            spec.point.drawvector=vector;
          }
        }
      }
      for (i = 0; i < arcs.length; i++) {
        spec=intersectarcline(arcs[i], outward);
        if (spec && spec.point1.floating===1){
          point1=pointat(spec.point1);
          if (point1.floating ===1){
            point1.floating = 2;
            point1.drawvector=vector;
          }
        }
        if (spec && spec.point2.floating===1){
          point2=pointat(spec.point2);
          if (point2.floating ===1){
            point2.floating = 2;
            point2.drawvector=vector;
          }
        }
      }
      redrawall();
    }
    outward.split=function(splitpoint){
      var oldpoint=outward.point2;
      if (splitpoint===outward.point1||splitpoint===outward.point2){
        return;
      }
      else if (splitpoint.online(outward)&&splitpoint.inbox(outward)){
        changes[changes.length] = {type:"resize", a:outward, b:outward.point2};
        outward.point2=splitpoint;
        outward.length = Math.sqrt(Math.pow(outward.point2.x-outward.point1.x,2)+Math.pow(outward.point2.y-outward.point1.y,2));
        module.test.line(outward);
        var newline=lineat(splitpoint,oldpoint,outward.color,true);
      }
    }
    outward.point1 = point1;
    outward.point2 = point2;
    outward.length = Math.sqrt(Math.pow(point2.x-point1.x,2)+Math.pow(point2.y-point1.y,2));
    outward.name = "L"+point1.id+"-"+point2.id;
    outward.color = spec.color||geo.black;
    outward.id = spec.id;
    var vector={x:(outward.point2.x-outward.point1.x)/outward.length,y:(outward.point2.y-outward.point1.y)/outward.length};
    outward.angle=Math.atan2(vector.x,vector.y);
    
    //get rid of the old active floats before making new ones.
    deselect();
    return outward;
  };
  
  var arcat = function (centre,edge,color) {
    var checkarcs = function (){
      var i;
      for (i=0; i < arcs.length; i++){
        if (arcs[i].centre == centre && ((arcs[i].edge == edge) || (Math.abs(arcs[i].radius-radius)<1))){
          return arcs[i];
        }
      }
    }
    if (centre==edge){
    //don't make an arc in this case.
      return null;
    }
    //I compute the radius here so i can use it to check for equivelent circles.
    var radius = Math.sqrt(Math.pow(edge.x-centre.x,2) + Math.pow(edge.y-centre.y,2));
    var under= checkarcs();
    if (under== undefined) {
      //make a new arc
      arcs[arcs.length] = makearc(centre,edge,radius, {id:arcs.length});
      under=arcs[arcs.length-1];
      if (color==geo.grey){
        under.color=geo.grey;
      }
      module.test.arc(under);
      under.draw();
      changes[changes.length] = {type:"arc", a:centre.id, b:edge.id, obj:under};
      module.test.announce();
    }
    else {
      if (under.color == geo.grey){
        under.toggle();
        changes[changes.length] = {type:"arcdarken", a:centre.id, b:edge.id, obj:under};
      }
    }
    return under;
  };
  
  var makearc = function (centre,edge,radius, spec) {
    var outward = {};
    
    outward.centre = centre;
    outward.edge = edge;
    outward.radius = radius;
    outward.name = "A"+centre.id+"-"+edge.id;
    outward.id = spec.id;
    outward.color = geo.black;
    outward.draw = function () {
      var drawxy = getdrawxy({x:centre.x,y:centre.y});
      ctx.beginPath();
      ctx.arc(drawxy.x, drawxy.y, outward.radius*zoom,Math.PI*2,false);
      ctx.stroke();
    }
    outward.toggle = function (undo){
      if (this.color == geo.grey){
        this.color=geo.black;
      }
      else{
        this.color=geo.grey;
      }
      redrawall();
      if (undo !=1){
        changes[changes.length] = {type:"toggle", a:"arc", b:this.id};
      }
    }
    outward.intersects = function (arc2) {
      //someone elses code
      //http://stackoverflow.com/questions/12219802/a-javascript-function-that-returns-the-x-y-points-of-intersection-between-two-ci
      function intersection(x0, y0, r0, x1, y1, r1) {
        var a, dx, dy, d, h, rx, ry;
        var x2, y2;

        /* dx and dy are the vertical and horizontal distances between
         * the circle centers.
         */
        dx = x1 - x0;
        dy = y1 - y0;

        /* Determine the straight-line distance between the centers. */
        d = Math.sqrt((dy*dy) + (dx*dx));

        /* Check for solvability. */
        if (d > (r0 + r1)) {
          /* no solution. circles do not intersect. */
          return {result:"outside"};
        }
        if (d < Math.abs(r0 - r1)) {
          /* no solution. one circle is contained in the other */
          return {result:"inside"};
        }

        /* 'point 2' is the point where the line through the circle
         * intersection points crosses the line between the circle
         * centers.  
         */

        /* Determine the distance from point 0 to point 2. */
        a = ((r0*r0) - (r1*r1) + (d*d)) / (2.0 * d) ;

        /* Determine the coordinates of point 2. */
        x2 = x0 + (dx * a/d);
        y2 = y0 + (dy * a/d);

        /* Determine the distance from point 2 to either of the
         * intersection points.
         */
        h = Math.sqrt((r0*r0) - (a*a));

        /* Now determine the offsets of the intersection points from
         * point 2.
         */
        rx = -dy * (h/d);
        ry = dx * (h/d);

        /* Determine the absolute intersection points. */
        var p1x = x2 + rx;
        var p2x = x2 - rx;
        var p1y = y2 + ry;
        var p2y = y2 - ry;
        return {result:"intersection", point1:pointat({x: p1x, y: p1y, floating:0}), point2:pointat({x: p2x, y: p2y, floating:0}), inside:(d < r0)};
        
      }
      return intersection(outward.centre.x,outward.centre.y,outward.radius,arc2.centre.x,arc2.centre.y,arc2.radius);
    }
    var i;
    var spec;
    for (i = 0; i < arcs.length; i++) {
      outward.intersects(arcs[i]);
    }
    for (i = 0; i < lines.length; i++) {
      spec=intersectarcline(outward, lines[i]);
      if (spec){
        pointat(spec.point1);
        pointat(spec.point2);
      }
    }
    return outward;
  };
  
  
  var intersectarcline = function (arc,line){
    var ex = line.point1.x;
    var ey = line.point1.y;
    var lx = line.point2.x;
    var ly = line.point2.y;
    var cx = arc.centre.x;
    var cy = arc.centre.y;
    var r = arc.radius;
    
    //d is the direction vector, f is from the circle centre to the start of the vector.
    var dx = lx-ex;
    var dy = ly-ey;
    var fx = ex-cx;
    var fy = ey-cy;
    
    //someone else's code. I'm not really sure what happens here.
    
    var a = dx*dx+dy*dy;
    var b = 2*(fx*dx+fy*dy);
    var c = (fx*fx+fy*fy) - r*r ;
    
    var floating1 = 0;
    var floating2 = 0;
    
    var discriminant = b*b-4*a*c;
    if( discriminant < 0 ){
      // no intersection
    }
    else {
      // ray didn't totally miss sphere
      discriminant = Math.sqrt( discriminant );
      // t values are distance along the vector where the magic happens.
      var t1 = (-b - discriminant)/(2*a);
      var t2 = (-b + discriminant)/(2*a);
      
      
      //start at the line start, the point will be T distance along the vector.
      var p1x = ex + t1*dx;
      var p1y = ey + t1*dy;
      var p2x = ex + t2*dx;
      var p2y = ey + t2*dy;
      
      if (t1>1||t1<0){
        floating1=1;
      }
      if (t2>1||t2<0){
        floating2=1;
      }
      return {
        point1:{x: p1x, y: p1y, floating:floating1},
        point2:{x: p2x, y: p2y, floating:floating2}
      }
    }
  };
  
  var currentmouse = (function () {
    var module = {};
    var findedge = function (){
      var i,
        tolerence =12/zoom,
        testing,
        closest=[{point:null,distance:tolerence}];
      for (i=0; i < points.length; i++){
        if (points[i].floating!==1){
          testing = points[i].onarc(lastpoint,currentmouse.radius,tolerence);
          if (testing && Math.abs(testing.distance-closest[0].distance)<0.01){
            closest.push(testing);
          }
          else if(testing && testing.distance<closest[0].distance){
            closest=[testing];
          }
        }
      }
      if (closest[0].point===null){
        return null;
      }
      else {
        return closest;
      }
    }
    module.update = function (x,y){
      var xy = getxy({x:x,y:y});
      module.x=x;
      module.y=y;
      module.under=points.check(xy.x,xy.y,12/zoom,1);
      module.radius = null;
      module.edge = null;
      if (lastpoint){
        if (module.under){
        }
        else{
          module.radius= Math.sqrt(Math.pow(lastpoint.x-xy.x,2) + Math.pow(lastpoint.y-xy.y,2));
          module.edges= findedge();
          if (module.edges){
            module.edge=module.edges[0].point;
            module.radius=module.edges[0].radius;
          }
        }
      }
    }
    return module;
  }());
  
  module.newlayer = function (){
    var i;
    for (i=0; i < lines.length; i++){
      if (lines[i].color == geo.black){
        lines[i].toggle();
      };
    }
    for (i=0; i < arcs.length; i++){
      if (arcs[i].color == geo.black){
        arcs[i].toggle();
      };
    }
    changes[changes.length] = {type:"newlayer", a:"", b:""};
    changes.record();
    redrawall();
  };
  
  //lazy hack to make outside reference
  module.undo = function(){
    changes.undo();
    changes.record(1);
  }
  module.redo = function(){
    changes.redo();
  }
  module.pressreset = function(){
    geo.resetall();
    changes.record(1);
  }
  
  changes.undo = function (){
    geo.test.clear();
    var lastchange = changes[changes.length-1];
    if (lastpoint){
      deselect();
      currentmouse.update();
      redrawd();
    }
    else if (changes.jumps.length>2){
      changes.record();
      if (changes.seal!=changes.length){
      changes.redonuke();
      }
      if (changes.jumps.length!=1){
      //don't get rid of the 0 node
        var i
        var shape;
        for (i=0;i<changes.jumps[changes.jumps.length-1]-changes.jumps[changes.jumps.length-2];i++){
          lastchange = changes[changes.length-1];
          //undo small changes until one "jump" is completed
          if (lastchange.type =="point"){
            points.pop();
          }
          else if (lastchange.type =="line"){
          }
          else if (lastchange.type =="arc"){
            arcs.pop();
          }
          else if (lastchange.type =="sink"){
            points[lastchange.a].floating=1;
          }
          else if (lastchange.type =="sharpen"){
            points[lastchange.a].sharp=0;
          }
          else if (lastchange.type =="free"){
            //free doesn't really do anything, it just goes along with a point
          }
          else if (lastchange.type =="start"){
            //free doesn't really do anything, it just goes along with a point
          }
          else if (lastchange.type =="toggle"){
            if (lastchange.a == "arc"){
              shape = arcs;
            }
            else if (lastchange.a == "line"){
              shape = lines;
            }
            shape[lastchange.b].toggle(1);
          }
          else if (lastchange.type =="resize"){
            lastchange.a.point2=lastchange.b;
            lastchange.a.length = Math.sqrt(Math.pow(lastchange.a.point2.x-lastchange.a.point1.x,2)+Math.pow(lastchange.a.point2.y-lastchange.a.point1.y,2));
          }
          else if (lastchange.type =="realline"){
            lines.pop();
          }
          changes.unchanges[changes.unchanges.length]=changes.pop();
        }
        changes.unchanges.jumps[changes.unchanges.jumps.length]=changes.jumps[changes.jumps.length-1]-changes.jumps[changes.jumps.length-2];
        changes.seal=changes.length;
        changes.jumps.pop();
      }
    }
    currentmouse.update(currentmouse.x,currentmouse.y);
    redrawall();
  };
  
  changes.redo = function (){
    geo.test.clear();
    if (changes.seal==changes.length){
      var i;
      var j;
      var shape;
      for (i = 0; i<changes.unchanges.jumps[changes.unchanges.jumps.length-1]; i++){
        lastchange = changes.unchanges[changes.unchanges.length-1];
        //this ignores a few things like newlayer and point.
        if (lastchange.type == "line"){
          module.add({type:"line", a:points[lastchange.a], b:points[lastchange.b]});
          //changes[changes.length]=changes.unchanges.pop();
        }
        else if (lastchange.type == "arc"){
          module.add({type:"arc", a:points[lastchange.a], b:points[lastchange.b]});
          //changes[changes.length]=changes.unchanges.pop();
        }
        else if (lastchange.type == "free"){
          module.add({type: "free", a:lastchange.a, b:lastchange.b});
        }
        else if (lastchange.type == "start"){
          module.add({type: "start", a:lastchange.a, b:lastchange.b});
        }
        else if (lastchange.type == "toggle"){
          if (lastchange.a == "arc"){
              shape = arcs;
            }
            else if (lastchange.a == "line"){
              shape = lines;
            }
            shape[lastchange.b].toggle();
        }
        else if (lastchange.type == "newlayer"){
          geo.newlayer();
        }
        changes.unchanges.pop();
        changes.seal=changes.length;
      };
      changes.unchanges.jumps.pop();
      changes.record(1);
    }
    else {
    changes.redonuke();
    }
  };
  
  changes.redonuke = function (){
    changes.unchanges = [];
    changes.unchanges.jumps =[0];
  };

  changes.record = function (finished){
    //if the current number of changes doesn't match the recorded one, record the difference as the most resent jump.
    if (changes.jumps[changes.jumps.length-1]!=changes.length){
      changes.jumps[changes.jumps.length]=changes.length;
    }
    //update that hash!
    if (finished==1){
    currenthash=changes.tostring().slice(0,-1);
    window.location.hash=currenthash;
    geo.test.update();
    }
  };
  
  changes.tostring = function (){
    var i
    var chain = "#";
    var type;
    for (i=0;i<changes.length; i++){
      if (changes[i].type == "line"){
        //if (changes[i].obj.color == geo.grey){
        //  type="M";
        //}
        //else {
        type="L";
        chain = chain + changes[i].a + type + changes[i].b + ".";
        //}
      }
      else if (changes[i].type == "arc"){
        //if (changes[i].obj.color == geo.grey){
        //  type="B";
        //}
        //else {
        type="A";
        chain = chain + changes[i].a + type + changes[i].b + ".";
        //}
      }
      else if (changes[i].type == "arcdarken"){
        type="A";
        chain = chain + changes[i].a + type + changes[i].b + ".";
      }
      else if (changes[i].type == "free"){
        type="F";
        chain = chain + changes[i].a + type + changes[i].b + ".";
      }
      else if (changes[i].type == "newlayer"){
        if (type!=="N"){
          type="N";
          chain = chain + changes[i].a + type + changes[i].b + ".";
        }
      }
    }
    return chain;
  }
  
  module.loadhash = function (){
    var hash=window.location.hash;
    changes.replay(hash);
  }
  
  var currenthash;
  if ("onhashchange" in window) 
  {
  window.onhashchange = function hashchanged()
    {
    if (window.location.hash != 0 )
      {
      if (window.location.hash != currenthash)
        {
        module.resetall();
        geo.loadhash();
        }
      }
    }
  }
  
  changes.decode = function (hash) {
    var i;
    var step = {};
    var ab = 0;
    var aid = 0;
    var bid = 0;
    var neg = 1;
    var color = 0;
    for (i=0;i<hash.length; i++) {
      if (hash.charAt(i) == "#"){
        //ignore!
      }
      else if (hash.charAt(i) == "L"){
        step={type: "line"};
        ab=1;
      }
      else if (hash.charAt(i) == "A"){
        step={type: "arc"};
        ab=1;
      }
      else if (hash.charAt(i) == "M"){
        step={type: "line"};
        color =geo.grey;
        ab=1;
      }
      else if (hash.charAt(i) == "B"){
        step={type: "arc"};
        color =geo.grey;
        ab=1;
      }
      else if (hash.charAt(i) == "F"){
        step={type: "free"};
        aid = aid*neg;
        neg= 1;
        ab=1;
      }
      else if (hash.charAt(i) == "N"){
        step={type: "newlayer"}
        ab=1;
      }
      else if (hash.charAt(i) == "-"){
        neg= -1;
      }
      else {
        //char should 0-9. I should probably add a check for this.
        if (ab == 0){
          aid = aid*10 + (hash.charAt(i)-0);
        }
        else{
          bid = bid*10 + (hash.charAt(i)-0);
        }
      }
    }
    bid = bid*neg;
    if (step.type == "free"){
      step.a = aid;
      step.b = bid;
      module.add(step, color);
    }
    else if (step.type == "newlayer"){
      geo.newlayer();
    }
    else {
      step.a = points[aid];
      step.b = points[bid];
      module.add(step, color);
    }
    changes.record();
  };
  
  changes.replay = function (hash){
    //splits the replay chain up for decode to handle
    var steps = hash.split(".");
    var i;
    for (i=0;i<steps.length; i++) {
      changes.decode(steps[i]);   
    }
    changes.record();
    geo.centre();
    geo.test.update();
  };
  
  document.onkeydown = function(e) {
    //console.log(e.keyCode)
    if (e.keyCode == 32) {
      //"space"
      if (lastpoint){
        changes.undo();
      }
    }
    else if (e.keyCode === 17) {
      keyheld.ctrl=true;
    }
    else if (e.keyCode === 16) {
      //keyheld.shift=true;
      //geo.d.className="point";
    }
    else if (e.keyCode === 69) {
      //"e"
      geo.newlayer();
      changes.record(1);
    }
    else if (e.keyCode === 90) {
      //"z"
      if (e.shiftKey) {
        changes.redo();
      }
      else {
        changes.undo();
        changes.record(1);
      }
    }
    else if (e.keyCode === 88) {
      //"x"
      changes.redo();
    }
    else if (e.keyCode === 27) {
      if (lastpoint){
        changes.undo();
      }
    }
    else if (e.keyCode === 67) {
      //"c"
      //geo.dottodot();
      //geo.robot();
    }
    else if (e.keyCode === 82) {
      //"r"
      geo.resetall();
      changes.record(1);
    }
    else if (e.keyCode === 37) {
      //"left"
      geo.nudge.down("left");
    }
    else if (e.keyCode === 38) {
      //"up"
      geo.nudge.down("up");
    }
    else if (e.keyCode === 39) {
      //"right"
      geo.nudge.down("right");
    }
    else if (e.keyCode === 40) {
      //"down"
      geo.nudge.down("down");
    }
    else if (e.keyCode === 65) {
      //"a"
      geo.nudge.down("left");
    }
    else if (e.keyCode === 87) {
      //"w"
      geo.nudge.down("up");
    }
    else if (e.keyCode === 68) {
      //"d"
      geo.nudge.down("right");
    }
    else if (e.keyCode === 83) {
      //"s"
      geo.nudge.down("down");
    }
    else if (e.keyCode === 81) {
      //"q"
      
    }
    else if (e.keyCode === 61) {
      //"+/="
      geo.zoomnudge(1);
    }
    else if (e.keyCode === 173) {
      //"-"
      geo.zoomnudge(-1);
    }
    else if (e.keyCode === 70) {
      //"f"
      geo.zoomnudge(1);
    }
    else if (e.keyCode === 86) {
      //"v"
      geo.zoomnudge(-1);
    }
  };
  
  document.onkeyup = function(e) {
    //console.log(e.keyCode)
    if (e.keyCode === 17) {
    keyheld.ctrl=false;
    }
    if (e.keyCode === 16) {
    //keyheld.shift=false;
    //geo.d.className="openhand";
    }
    else if (e.keyCode === 37) {
      //"left"
      geo.nudge.up("left");
    }
    else if (e.keyCode === 38) {
      //"up"
      geo.nudge.up("up");
    }
    else if (e.keyCode === 39) {
      //"right"
      geo.nudge.up("right");
    }
    else if (e.keyCode === 40) {
      //"down"
      geo.nudge.up("down");
    }
    else if (e.keyCode === 65) {
      //"a"
      geo.nudge.up("left");
    }
    else if (e.keyCode === 87) {
      //"w"
      geo.nudge.up("up");
    }
    else if (e.keyCode === 68) {
      //"d"
      geo.nudge.up("right");
    }
    else if (e.keyCode === 83) {
      //"s"
      geo.nudge.up("down");
    }
  };
  
  module.mouse = (function(){
    var module = {},
      down = {},
      current = {};
    module.held=0;
    var justselected=0;
    module.startdrag=function(contact){
      current =contact;
      geo.nudge.down("click");
      module.held=1;
    }
    module.stopdrag = function(){
      module.held=0;
      geo.nudge.up("click");
    }
    module.down=function(e) {
      //don't want to drag when clicking on a point.
      if ((currentmouse.under == null && currentmouse.edge == null) && (keyheld.shift==false)){
        module.startdrag({x:e.clientX,y:e.clientY});
      }
      else if ((currentmouse.under && lastpoint == undefined)&& (keyheld.shift==false)){
        select(currentmouse.under);
        justselected=currentmouse.under;
      }
    };
    module.out = function (e){
      if (e.relatedTarget==null && module.held){
        module.up(e);
      }
    };
    module.up = function (e){
      if (module.held){
        module.stopdrag();
        }
      else if (currentmouse.under===null ||currentmouse.under !== justselected){
        //my old click handler.
        var xy;
        var under;
        //if shift is held, then points can be drawn in gaps. otherwise it must be an old point.
        if (keyheld.shift){
          //make a new point if need be
          xy = getxy({x:e.clientX,y:e.clientY});
          under=pointat({x:Math.floor(xy.x),y:Math.floor(xy.y),free:1},12/zoom);
          under.type="free";
          changes.record(1);
        }
        else if (lastpoint) {
          currentmouse.update(e.clientX,e.clientY);
          //just find an existing point
          if (currentmouse.under){
            lineat(lastpoint,currentmouse.under);
            deselect();
            //record many changes there has been since the last click
            changes.record(1);
          }
          else if (currentmouse.edge){
            arcat(lastpoint,currentmouse.edge);
            deselect();
            currentmouse.update(currentmouse.x,currentmouse.y);
            deselect();
            changes.record(1);
          }
        }
      }
      justselected=null;
    };
    module.move = function (e){
      currentmouse.update(e.clientX,e.clientY);
      if (module.held===1){
        offsetx-=current.x-e.clientX;
        offsety-=current.y-e.clientY;
        current.x=e.clientX;
        current.y=e.clientY;
        //redrawall();
      }
      else {
        //cursor checker. checks contents of the area clicked.
        //if the mouse is over a point it changes the class to make a clicky hand, and shows intercepts.
        if (keyheld.shift){
          geo.d.className="point";
        }
        else{
          if (justselected&&currentmouse.under!==justselected){
            justselected=null;
          }
          if (currentmouse.under) {
            geo.d.className="point";
            if (!intersectswanted) {
              intersectswanted=true;
              redrawall();
            }
          }
          else if (currentmouse.edge){
            geo.d.className="point";
          }
          else {
            geo.d.className="openhand";
            if (!lastpoint && intersectswanted) {
              intersectswanted=false;
              redrawall();
            }
          }
        }
        redrawd();
      }
    };
    return module;
  }());
  
  module.touch=(function(){
    var module={};
    var pinching=false;
    var dropped=false;
    module.down=function(e){
      var touches= e.touches;
      e.preventDefault();
      if(e.touches.length === 2) {
        pinching = true;
        pinchstart(touches[0],touches[1]);
      }
      if(e.touches.length > 2) {
      }
      else {
        lastpos={clientX:touches[0].clientX,clientY:touches[0].clientY};
        cursormove();
        if (currentmouse.under){
          geo.mouse.down(touches[0]);
          cursormove();
        }
      }
    }
    module.up=function(e){
      var touches= e.changedTouches;
      //var fake={clientX:touches[0].clientX,clientY:touches[0].clientY};
      //var remaining= e.Touches;
      e.preventDefault();
      if (pinching){
        pinching=false;
        pinchstop();
        geo.mouse.stopdrag();
      }
      else {
        if (!lastpoint){
          geo.mouse.down(touches[0]);
        }
        geo.mouse.up(touches[0]);
        cursormove();
        currentmouse.under=null;
        redrawd();
      }
    }
    var lastpos;
    module.move=function(e){
      var touches= e.touches;
      var changed=e.changedTouches[0];
      e.preventDefault();
      if (pinching){
        pinchmove(touches[0],touches[1]);
      }
      else {
        lastpos={clientX:changed.clientX,clientY:changed.clientY};
        
        //currentmouse.update(lastpos.clientX,lastpos.clientY);
        //redrawd();
        cursormove();
        //geo.mouse.move(touches[0]);
      }
    }
    var cursormove=function(big){
      currentmouse.update(lastpos.clientX,lastpos.clientY);
      if (currentmouse.under) {
        if (!intersectswanted) {
          intersectswanted=true;
          redrawall();
        }
      }
      else if (currentmouse.edge){
      }
      else if (!lastpoint && intersectswanted) {
        intersectswanted=false;
        redrawall();
      }
      else if (lastpoint && !intersectswanted) {
        intersectswanted=true;
        redrawall();
      }
      redrawd();
    }
    var centre;
    var lastdistance;
    var pinchstart=function(touch1,touch2){
      centre={x:touch1.clientX-(touch1.clientX-touch2.clientX)/2,y:touch1.clientY-(touch1.clientY-touch2.clientY)/2};
      geo.mouse.startdrag(centre);
      var lastdistance=Math.sqrt((touch1.clientX-touch2.clientX)*(touch1.clientX-touch2.clientX)+(touch1.clientY-touch2.clientY)*(touch1.clientY-touch2.clientY));
    }
    var pinchmove=function(touch1,touch2){
      centre={x:touch1.clientX-(touch1.clientX-touch2.clientX)/2,y:touch1.clientY-(touch1.clientY-touch2.clientY)/2};
      geo.mouse.move({clientX:centre.x,clientY:centre.y});
      var distance=Math.sqrt((touch1.clientX-touch2.clientX)*(touch1.clientX-touch2.clientX)+(touch1.clientY-touch2.clientY)*(touch1.clientY-touch2.clientY));
      var detla;
      if (lastdistance){
        delta=lastdistance/distance;  
      }
      else{
        delta=1;
      }
      var newzoom=zoom/delta;
      zoomset(newzoom,centre);
      lastdistance=distance;
      //console.log(distance,centre);
    }
    var pinchstop = function(){
      lastdistance=null;
    }
    
    return module;
  }());
  
  module.nudge = (function(){
    var module = {},
      pressed = {},
      x=0,
      y=0,
      speed=2;
    module.active = false;
    module.down = function (direction){
      pressed[direction]=true;
      if (!module.active){
        module.active=true;
        module.loop();
      }
      module.update();
    }
    module.up = function (direction){
      pressed[direction]=false;
      module.update();
    }
    module.update = function(){
      if (pressed.left && !pressed.right){
        x=-speed;
      }
      else if (pressed.right && !pressed.left){
        x=speed;
      }
      else {
        x=0;
      }
      
      if (pressed.up && !pressed.down){
        y=-speed;
      }
      else if (pressed.down && !pressed.up){
        y=speed;
      }
      else {
        y=0;
      }
      
      if (((pressed.left||pressed.up)||(pressed.right||pressed.down))||pressed.click){
        module.active=true;
      }
      else{
        module.active=false;
      }
    }
    module.loop = function(){
      offsetx+=x;
      offsety+=y;
      redrawall();
      if (module.active){
        requestAnimFrame(geo.nudge.loop);
      }
    }
    return module;
  }());
  
  
  var getdrawxy = function (xy){
  //input a 1:1 xy and get an xy for the current zoom and position. offsets are in current pixels.
    xy.x = xy.x*zoom+offsetx;
    xy.y = xy.y*zoom+offsety;
    return xy;
  };
  
  var getxy = function (xy){
    xy.x = (xy.x-offsetx)/zoom;
    xy.y = (xy.y-offsety)/zoom;
    return xy;
  };
  
  var zoomcount=-4;
  zoom=Math.pow(1.25,zoomcount);
  module.zoom = function (e) {
    e.preventDefault();
    var delta = Math.max(-1, Math.min(1, (e.wheelDelta || (0-e.detail))));
    zoomcount+=delta;
    zoomset(Math.pow(1.25,zoomcount),{x:e.clientX,y:e.clientY});
  };
  
  module.zoomnudge=function(delta){
    zoomcount+=delta;
    zoomset(Math.pow(1.25,zoomcount),{x:geo.wwidth/2,y:geo.wheight/2});
  }
  
  var zoomset = function(newzoom,centre){
    var xy=getxy({x:centre.x,y:centre.y})
    zoom=newzoom;
    offsetx=-(xy.x*zoom-centre.x);
    offsety=-(xy.y*zoom-centre.y);
    redrawall();
  }
  
  module.robot = function (){
  //this robot will draw one random line or arc. It has been very useful for testing.
    var randompoints = function () {
      var pair = {};
      pair.a=points[Math.floor(Math.random()*points.length)];
      pair.b=points[Math.floor(Math.random()*points.length)];
      //reroll if points are same or either is floating.
      if ((pair.a==pair.b)||((pair.a.floating===1)||(pair.b.floating===1))){
        return randompoints();
      }
      else{
        return pair;
      }
    }
    var spec = randompoints();
    
    if (Math.floor(Math.random()*2)==1){
      spec.type="line";
    }
    else{
      spec.type="arc";
    }
    module.add(spec);
    changes.record(1);
  };
  
  module.add = function (spec, color){
    if (spec.type=="free"){
      spec.free=1;
      pointat({x:spec.a,y:spec.b,free:1});
      changes.record();
    }
    else if (spec.type=="start"){
      spec.free=2;
      pointat({x:spec.a,y:spec.b,free:2});
    }
    else {
      if (spec.type=="line"){
        lineat(spec.a,spec.b,color);
      }
      else if (spec.type=="arc"){
        arcat(spec.a,spec.b,color);
      }
    }
  };
  
  module.centre=function(){
    var i;
    var centre;
    var smallest;
    var biggest;
    var hgap=geo.wwidth/12;
    var vgap=geo.wheight/12;
    var screenmin;
    //centre the screen
    smallest={x:points[0].x,y:points[0].y};
    biggest={x:points[0].x,y:points[0].y};
    for (i=1;i<points.length;i++){
      if (points[i].sharp&&points[i].x<smallest.x){
        smallest.x=points[i].x;
      }
      else if (points[i].sharp&&points[i].x>biggest.x){
        biggest.x=points[i].x;
      }
      if (points[i].sharp&&points[i].y<smallest.y){
        smallest.y=points[i].y;
      }
      else if (points[i].sharp&&points[i].y>biggest.y){
        biggest.y=points[i].y;
      }
    }
    for (i=0;i<arcs.length;i++){
      if (arcs[i].centre.x-arcs[i].radius<smallest.x){
        smallest.x=arcs[i].centre.x-arcs[i].radius;
      }
      if (arcs[i].centre.x+arcs[i].radius>biggest.x){
        biggest.x=arcs[i].centre.x+arcs[i].radius;
      }
      if (arcs[i].centre.y-arcs[i].radius<smallest.y){
        smallest.y=arcs[i].centre.y-arcs[i].radius;
      }
      if (arcs[i].centre.y+arcs[i].radius>biggest.y){
        biggest.y=arcs[i].centre.y+arcs[i].radius;
      }
    }
    centre={x:smallest.x+(biggest.x-smallest.x)/2,y:smallest.y+(biggest.y-smallest.y)/2};
    
    offsetx=geo.wwidth/2-centre.x*zoom;
    offsety=geo.wheight/2-centre.y*zoom;
    
    screenmin=getdrawxy({x:smallest.x,y:smallest.y});
    while (!(screenmin.x<hgap||screenmin.y<vgap)){
      zoomcount++;
      zoom=Math.pow(1.25,zoomcount);
      offsetx=geo.wwidth/2-centre.x*zoom;
      offsety=geo.wheight/2-centre.y*zoom;
      screenmin=getdrawxy({x:smallest.x,y:smallest.y});
    }
    while (screenmin.x<hgap||screenmin.y<geo.wheight/vgap){
      zoomcount--;
      zoom=Math.pow(1.25,zoomcount);
      offsetx=geo.wwidth/2-centre.x*zoom;
      offsety=geo.wheight/2-centre.y*zoom;
      screenmin=getdrawxy({x:smallest.x,y:smallest.y});
    }
    redrawall();
  }
  
  module.test = (function(){
    var module = {};
    var arcsizes = [2,1+2/3*Math.sqrt(3),1+Math.sqrt(2),1+Math.sqrt(2*(1+1/Math.sqrt(5))),3,3];
    module.line = function(line){
      findloops(line);
    }
    module.arc = function(startarc){
      var sizes = arcsizes;
      var arcisunit = function(){
        var unitradius=startarc.radius;
        var unitcircles=[];
        var i;
        var j;
        for (i=0;i<arcs.length;i++){
          if (Math.abs(arcs[i].radius-unitradius)<0.0001){
            unitcircles.push(arcs[i]);
          }
        }
        //for every circle
        for (i=0;i<arcs.length;i++){
          //check every size up to the number of unit circles
          for (j=1;j<unitcircles.length;j++){
              //if something is the correct size
              if (Math.abs(arcs[i].radius-unitradius*sizes[j-1])<unitradius*0.0001){
                findpacked(arcs[i],j+1,unitcircles);
              }
          }
        }
      }
      var arcisbig = function(){
        var i;
        var j;
        var unitcircles=[];
        //for every size
        for (i=0;i<sizes.length;i++){
          //for every circle
          unitcircles[i]=[];
          for (j=0;j<arcs.length;j++){
            if (Math.abs(arcs[j].radius-startarc.radius/sizes[i])<0.0001){
              unitcircles[i].push(arcs[j]);
            }
          }
        }
        for (i=0;i<unitcircles.length;i++){
          if (unitcircles[i].length>=i+2){
            findpacked(startarc,i+2,unitcircles[i]);
          }
        }
      }
      arcisunit();
      arcisbig();
    }
    
    var findpacked = function(big,required,unitcircles){
      var i;
      var intersect;
      var insides=[];
      var packed=[];
      var newbranch = function(insides,packed){
        var newinsides;
        var newpacked;
        var i;
        var j;
        var intersect;
        var seperate;
        for (i=0;i<insides.length;i++){
          seperate=true;
          for (j=0;j<packed.length;j++){
            intersect=packed[j].intersects(insides[i]);
            if (intersect.result==="outside"||(intersect.result==="intersection"&&intersect.point1===intersect.point2&&intersect.inside===false)){
              
            }
            else {
              seperate=false;
            }
          }
          if (seperate){
            newinsides=insides.slice(0);
            newinsides.splice(0,i+1);
            newpacked=packed.slice(0);
            newpacked.push(insides[i]);
            if (newpacked.length===required){
              module.unlocks.push({challenge:module.packchallenges[required],shapes:[].concat(big,newpacked),origin:(big===getarc0s()[0]||(getarc0s()[1]&&big===getarc0s()[1]))});
              return true;
            }
            else if (newpacked.length+newinsides.length>=required){
              newbranch(newinsides,newpacked);
            }
          }
        }
      }
      //get the subset of unitcircles that are entirely inside the first circle.
      for (i=0;i<unitcircles.length;i++){
        intersect=big.intersects(unitcircles[i]);
        if (intersect.result==="inside"||(intersect.result==="intersection"&&intersect.point1===intersect.point2&&intersect.inside===true)){
          insides.push(unitcircles[i]);
        }
      }
      newbranch(insides,packed);
    }
    var findloops = function(startline){
      var testlines=lines.slice(0);
      var firstpoint=startline.point1;
      var sorted=[];
      var firstnode;
      var loop;
      var completeloops=[];
      var i;
      for (i=0; i<testlines.length;i++){
        //find and remove the startline from the testing array
        if (testlines[i]===startline){
          firstnode={point: testlines[i].point2, line:testlines.splice(i,1)[0], heading:(startline.angle+Math.PI*2)%(Math.PI*2)};
          break;
        }
      }
      var firstangle=firstnode.heading;
      //we can't use this length until we have done one turn, so I set it to NaN. This is a stupid way to do it so hopefully i can fix it soon.
      sorted.sidelength=NaN;
      sorted.turns=0;
      sorted.corners=[];
      sorted.push(firstnode);
      var addbranch = function (testlines,sorted){
        var checklength = function (){
          newsorted.testlength=newsorted.testlength||sorted.sidelength;
          if (Math.abs(sorted.sidelength-newsorted.testlength)>newsorted.testlength*0.001){
            return false;
          }
          else{
            return true;
          }
        }
        var checkangle = function (){
          newsorted.testangle=newsorted.testangle||anglediff;
          if (Math.abs(anglediff-newsorted.testangle)>0.001){
            return false;
          }
          else{
            return true;
          }
        }
        var finish = function (sorted){
          var i;
          var points=[];
          var arc0s=getarc0s();
          var origin0=true;
          var origin1=true;
          for (i=0;i<sorted.corners.length;i++){
            if (!sorted.corners[i].onarc(arc0s[0].centre,arc0s[0].radius,arc0s[0].radius*0.000001)){
              origin0=false;
              break;
            }
          }
          if (arc0s[1]){
            for (i=0;i<sorted.corners.length;i++){
              if (!sorted.corners[i].onarc(arc0s[1].centre,arc0s[1].radius,arc0s[1].radius*0.000001)){
                origin1=false;
                break;
              }
            }
          }
          else {
            origin1=false;
          }
          var challenge=module.linechallenges[sorted.turns]||newlinechallenge(sorted.turns);
          module.unlocks.push({challenge:challenge,shapes:sorted.corners,origin:origin0||origin1});
        }
        //finds the next line and point.
        var newlines;
        var newnode;
        var newsorted;
        var goodbranch;
        var node=sorted[sorted.length-1];
        if (node.point === firstpoint){
          //save this loop
          newsorted={};
          newsorted.testlength=sorted.testlength;
          if (Math.abs(firstangle-node.heading)<0.001){
            finish(sorted);
          }
          else if (checklength()){
            sorted.turns++
            //console.log("finish with corner",node.point.id,sorted.turns);
            sorted.corners.push(node.point);
            finish(sorted);
          }
          return;
        }
        var i;
        for (i=0; i<testlines.length;i++){
          if (node.point===testlines[i].point1){
            newnode={point: testlines[i].point2,line: testlines[i], heading:(testlines[i].angle+Math.PI*2)%(Math.PI*2)};
          }
          else if (node.point===testlines[i].point2){
            newnode={point: testlines[i].point1,line: testlines[i], heading:((testlines[i].angle+Math.PI*3)%(Math.PI*2))};
          }
          if (node.point===testlines[i].point1||node.point===testlines[i].point2){
            newsorted=sorted.slice(0);
            newsorted.corners=sorted.corners.slice(0);
            newsorted.turns=sorted.turns;
            newsorted.testangle=sorted.testangle;
            newsorted.testlength=sorted.testlength;
            newsorted.sidelength=sorted.sidelength;
            
            anglediff=(node.heading)-(newnode.heading);
            anglediff=(anglediff+Math.PI*2)%(Math.PI*2);
            if (Math.abs(anglediff)>0.001&&Math.abs(anglediff-(Math.PI*2))>0.001){
              //the line has turned
              //test the length is the same as the first side
              if (checklength()&&checkangle()){
                newsorted.sidelength=0;
                newsorted.turns++;
                newsorted.corners.push(node.point);
                goodbranch=true;
              }
              else {
                goodbranch=false;
              }
            }
            else{
              goodbranch=true;
            }
            if (goodbranch){
              newsorted.sidelength+=testlines[i].length;
              newsorted.push(newnode);
              newlines=testlines.slice(0);
              newlines.splice(i,1);
              addbranch(newlines,newsorted);
            }
          }
        }
      }
      addbranch(testlines,sorted);
    }
    var getarc0s = function(){
      var arc0s=[arcs[0]];
      var i;
      for (i=1;i<arcs.length;i++){
        if (arcs[i].centre===arcs[0].edge&&Math.abs(arcs[0].radius-arcs[i].radius)<arcs[i].radius*0.0001){
          arc0s[1]=arcs[i];
          break;
        }
      }
      return arc0s;
    }
    module.challenges=[];
    module.awards=[];
    module.innit = function(){
      module.linechallenges={};
      module.packchallenges={};
      module.linechallenges[3]=(makechallenge({type:"poly",num:3,label:"Equilateral Triangle",record:5,record2:8}));
      module.linechallenges[6]=(makechallenge({type:"poly",num:6,label:"Regular Hexagon",record:10,record2:14}));
      module.packchallenges[2]=(makechallenge({type:"pack",num:2,label:"Circles",record:5,record2:10}));
      module.linechallenges[4]=(makechallenge({type:"poly",num:4,label:"Square",record:8,record2:12}));
      // module.packchallenges[3]=(makechallenge({type:"pack",num:3,label:"CIRCLE PACK 3",record:9,record2:16}));
      // module.packchallenges[7]=(makechallenge({type:"pack",num:7,label:"CIRCLE PACK 7",record:14,record2:20}));
      // module.linechallenges[8]=(makechallenge({type:"poly",num:8,label:"OCTAGON",record:15,record2:24}));
      // module.linechallenges[12]=(makechallenge({type:"poly",num:12,label:"DODECAGON",record:20,record2:26}));
      // module.packchallenges[4]=(makechallenge({type:"pack",num:4,label:"CIRCLE PACK 4",record:12,record2:18}));
      // module.linechallenges[5]=(makechallenge({type:"poly",num:5,label:"PENTAGON",record:15,record2:21}));
      loadextras();
    }
    var extras=0;
    var newlinechallenge=function(sides){
      module.linechallenges[sides]=(makechallenge({type:"poly",num:sides,label:sides+"-GON"}));
      localStorage["extra"+extras]=sides;
      extras++;
      return module.linechallenges[sides];
    }
    //there was a bug here that would only load every second entry, it now has to check one ahead in case there are gaps in your saves.
    var loadextras=function(){
      while(localStorage["extra"+extras]||localStorage["extra"+(extras+1)]){
        if (localStorage["extra"+extras]){
          newlinechallenge(localStorage["extra"+extras]);
        }
        else{
          extras++
        }
      }
    }
    module.unlocks = [];
    module.clear = function (){
      var i;
      for (i=0;i<module.challenges.length;i++){
        module.challenges[i].kill();
      }
      redrawall();
    }
    module.announce = function (){
      var i;
      var j;
      for (i=0;i<module.unlocks.length;i++){
        if (module.unlocks[i].challenge){
            module.unlocks[i].challenge.newshapes=module.unlocks[i].shapes;
            module.unlocks[i].challenge.neworigin=module.unlocks[i].origin;
            if (module.unlocks[i].challenge.announce()){
              module.unlocks[i].challenge.wake();
            }
        }
      }
      module.unlocks = [];
    }
    var makechallenge = function (spec){
      var outward={};
      var area=document.getElementById("rewards");
      outward.id=spec.type+spec.num;
      outward.best=null;
      outward.obest=null;
      outward.update=function(){
        var i;
        for (i=0;i<awards.length;i++){
          awards[i].update();
        }
      }
      outward.announce=function(score,hash,oscore,ohash){
        //this function runs when a challenge is completed.
        var score=score||module.score();
        var newrecord=(outward.best===null||score<outward.best);
        var neworigin=outward.neworigin&&(outward.obest===null||score<outward.obest);
        if (newrecord||neworigin){
          d.scrollIntoView();
          if (newrecord){
            outward.best=score;
            localStorage[outward.id+"best"]=score;
            outward.hash=(hash||changes.tostring().slice(0,-1));
            localStorage[outward.id+"hash"]=outward.hash;
            s.innerHTML=outward.best+" moves";
            d.className="unlocked";
          }
          if (neworigin||oscore){
            outward.obest=oscore||score;
            localStorage[outward.id+"obest"]=outward.obest;
            outward.ohash=(ohash||changes.tostring().slice(0,-1));
            localStorage[outward.id+"ohash"]=outward.ohash;
          }
          if (outward.newshapes){
            outward.shapes=outward.newshapes;
          }
          outward.update();
          return true;
        }
        else{
          return false;
        }
      }
      outward.highlight=function(){
        //this function is called at redraw if the challenge is active, and fills in the solved shape.
        var highlightpoly = function(){
          var i;
          var draw=getdrawxy({x:outward.shapes[0].x,y:outward.shapes[0].y});
          ctx.beginPath();
          ctx.moveTo(draw.x,draw.y);
          for (i=1;i<outward.shapes.length;i++){
            draw=getdrawxy({x:outward.shapes[i].x,y:outward.shapes[i].y});
            ctx.lineTo(draw.x,draw.y);
          }
          ctx.fill();
        }
        var highlightpack = function(){
          var i;
          var drawxy;
          drawxy=getdrawxy({x:outward.shapes[0].centre.x,y:outward.shapes[0].centre.y});
          ctx.beginPath();
          ctx.arc(drawxy.x, drawxy.y, outward.shapes[0].radius*zoom,Math.PI*2,false);
          ctx.fill();
          ctx.fillStyle="#ffffff";
          //ctx.fillStyle=geo.medium;
          for (i=1;i<outward.shapes.length;i++){
            drawxy=getdrawxy({x:outward.shapes[i].centre.x,y:outward.shapes[i].centre.y});
            ctx.beginPath();
            ctx.arc(drawxy.x, drawxy.y, outward.shapes[i].radius*zoom,Math.PI*2,false);
            ctx.fill();
          }
        }
        if (spec.type==="poly"){
          highlightpoly();
        }
        else if (spec.type==="pack"){
          highlightpack();
        }
      }
      outward.active=false;
      outward.wake=function(){
        //the shape needs to be highlit upon rewdraw
        outward.active=true;
        redrawall();
      }
      outward.kill=function(){
        //the shape no longer needs to be highlit upon redraw
        outward.active=false;
      }
      outward.load=function(ohash){
        //load the saved solution from the hash
        var hash;
        if (ohash){
          hash=outward.ohash;
        }
        else {
          hash=outward.hash;
        }
        if (hash){
          geo.resetall();
          changes.replay(hash);
          currenthash=hash;
          window.location.hash=hash;
          outward.shapes=outward.newshapes;
          outward.active=true;
          redrawall();
        }
      }
      outward.tip=function(tiptext,state){
        s.innerHTML=tiptext;
        if (state){
          s.className="";
        }
        else{
          s.className="grey";
        }
      }
      outward.showscore=function(){
        if (outward.best){
          s.innerHTML=outward.best+" moves";
        }
        else {
          s.innerHTML="INCOMPLETE";
        }
        s.className="";
      }
      var makeaward=function(awardspec){
        var award={};
        var c=document.createElement("canvas");
        var cell = document.createElement("td");
        c.width=36;
        c.height=36;
        var shrink=7/8;
        var fontsize=24;
        
        tr.appendChild(cell);
        cell.appendChild(c);
        var ttx=c.getContext("2d");
        cell.className="awardgrey";
        
        award.state=false;
        if (awardspec.origin){
          award.tip="In origin circle";
        }
        else if (awardspec.value){
          award.tip="In "+awardspec.value+" moves or less";
        }
        else{
          award.tip="Constructed";
        }
        award.update=function(){
          if (!award.state){
            if (!outward.best){
              return
            }
            if (awardspec.value&&outward.best>awardspec.value){
              return
            }
            if (awardspec.origin&&!outward.obest){
              return
            }
            award.state=true;
            module.updatepoints();
            cell.className="awardblack";
            render();
          }
        }
        cell.onmouseover=function (){outward.tip(award.tip,award.state);};
        cell.onmouseout=function (){outward.showscore();};
        if (awardspec.origin){
          cell.onclick = (function (){
            return function(event){
              event.stopPropagation();
              outward.load(true);
            }
          }());
        }
        var render=function(){
          //this renders the thumbnail picture.
          var renderpoly=function(num){
            var length = 2*(c.width/2*shrink)*Math.sin(Math.PI/num),
            //var length = c.width*2/3,
              x,
              y,
              i,
              heading=(360/num)/2+180,
              radians;
              
            x = c.width/2;
            y = c.height/2-(c.width/2*shrink);
            ttx.beginPath();
            ttx.moveTo(x,y);
              for (i=0; i<(num); i++){
                heading-=360/(num);
                radians = heading * (Math.PI / 180);
                x += length * Math.cos(radians);
                y += length * Math.sin(radians);
                ttx.lineTo(x, y);
              }
            ttx.stroke();
          }
          var renderpack=function(num,extra){
            var big=c.width/2*shrink;
            var size=arcsizes[num-2]
            var unit=big/size;
            var angle;
            var startx=c.width/2;
            var starty=c.height/2;
            var x;
            var y;
            var i;
            ttx.beginPath();
            ttx.arc(startx,starty, big,Math.PI*2,false);
            ttx.stroke();
            for (i=0;i<num;i++){
              radians=((2*Math.PI)/num)*i;
              x = startx + ((big-unit) * Math.cos(radians));
              y = starty + ((big-unit) * Math.sin(radians));
              ttx.beginPath();
              ttx.arc(x,y, unit,Math.PI*2,false);
              ttx.stroke();
            }
            if (extra){
              ttx.beginPath();
              ttx.arc(startx,starty,unit,Math.PI*2,false);
              ttx.stroke();
            }
          }
          c.width=c.width;
          
          if (awardspec.value){
            ttx.strokeStyle="#ffffff";
          }
          else if (award.state){
            ttx.strokeStyle=geo.black;
          }
          else{
            ttx.strokeStyle=geo.grey;
          }
          if (spec.type==="poly"){
            renderpoly(spec.num);
          }
          else if (spec.type==="pack"){
            if (spec.num===7){
              renderpack(6,true)
            }
            else{
              renderpack(spec.num);
            }
          }
          if (award.state){
            ttx.strokeStyle=geo.black;
            ttx.fillStyle=geo.black;
          }
          else {
            ttx.strokeStyle=geo.grey;
            ttx.fillStyle=geo.medium;
          }
          if (awardspec.value){
            ttx.font = "normal "+fontsize+"px courier new";
            ttx.textAlign = 'center';
            ttx.textBaseline = 'middle';
            ttx.fillText(awardspec.value,c.width/2,c.height/2);
          }
          else if  (awardspec.origin){
            if (spec.type==="poly"){
              ttx.beginPath();
              ttx.arc(c.width/2,c.height/2, c.width/2*shrink,Math.PI*2,false);
              ttx.stroke();
            }
            
            ttx.beginPath();
            ttx.arc(c.width/2,c.height/2, 3,Math.PI*2,false);
            ttx.fill();
          }
        }
        render();
        module.awards.push(award);
        return award;
      }
      
      var t = document.createElement("table");
      var tr = document.createElement("tr");
      var d = document.createElement("div");
      var l = document.createElement("p");
      var s = document.createElement("p");
      d.className="locked";
      d.onclick=function (){outward.load();};
      area.appendChild(d);
      
      d.appendChild(l);
      d.appendChild(s);
      d.appendChild(t);
      t.appendChild(tr);
      l.innerHTML=spec.label;
      s.innerHTML="INCOMPLETE";
      var awards=[];
      awards.push(makeaward({}));
      if (spec.record){
        awards.push(makeaward({origin:true}));  
      }
      if (spec.record2){
        awards.push(makeaward({value:spec.record2}));
      }
      if (spec.record){
        awards.push(makeaward({value:spec.record}));
      }
      if (localStorage[outward.id+"best"] && localStorage[outward.id+"hash"]){
        // outward.announce(localStorage[outward.id+"best"],localStorage[outward.id+"hash"],localStorage[outward.id+"obest"],localStorage[outward.id+"ohash"]);
      }
      outward.update();
      module.challenges.push(outward);
      return outward;
    }
    module.score = function(){
      var score;
      var i;
      var j;
      var unique
      var uniquelines=[];
      var intersect;
      for (i=0;i<(lines.length);i++){
        unique=true;
        for (j=0;j<(uniquelines.length);j++){
          intersect=lines[i].intersects(uniquelines[j],true);
          if (intersect.result==="co"){
            unique=false;
          }
        }
        if (unique){
          uniquelines.push(lines[i]);
        }
      }
      score=arcs.length+uniquelines.length;
      return score
    }
    module.points = function(){
      var points=0;
      var i;
      for (i=0;i<(module.awards.length);i++){
        if (module.awards[i].state){
          points++;
        }
      }
      return points;
    }
    module.update = function(){
      var score = module.score();
      var box=document.getElementById("runningscore");
      box.innerHTML=score;
    }
    module.updatepoints = function(){
      var points = module.points();
      var box=document.getElementById("totalpoints");
      box.innerHTML=points;
    }
    return module;
  }());
  
  return module;
}());

function loadpage() {
  geo.init();
  geo.d.addEventListener("mousewheel", geo.zoom, false);
  geo.d.addEventListener("DOMMouseScroll", geo.zoom, false);
  geo.d.addEventListener("touchstart", geo.touch.down, false);
  geo.d.addEventListener("touchend", geo.touch.up, false);
  geo.d.addEventListener("touchcancel", geo.touch.up, false);
  geo.d.addEventListener("touchleave", geo.touch.up, false);
  geo.d.addEventListener("touchmove", geo.touch.move, false);
}