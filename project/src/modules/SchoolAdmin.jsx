// ─── SchoolAdmin.jsx ──────────────────────────────────────────────────────────
// School administration panel with integrated 3D building blueprint.
// The Rooms tab shows the full 3D view of the school layout, live from Supabase.
// Admins can add/edit/delete rooms, and the 3D view updates in real time.

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { T } from '../lib/styles';
import { Field } from '../components/UI';
import {
  CATEGORIES, CAT_ICON, CAT_COLOR, STATUS_STYLE,
  BUILDINGS, FLOORS, SCHOOL_LEVELS, SCHOOL_TYPES,
} from '../lib/constants';

// ─── colour helpers ────────────────────────────────────────────────────────────
const CAT_3D = {
  Classroom:      '#4A7C1F',
  Laboratory:     '#185FA5',
  Library:        '#6B3FA0',
  'Admin Office': '#B85C00',
  Gym:            '#A32D2D',
  'Faculty Room': '#2D7D7D',
  Canteen:        '#8B5E00',
  Clinic:         '#1D6E6E',
  default:        '#888780',
};
function cat3d(cat){ return CAT_3D[cat] || CAT_3D.default; }
function darken(hex,a=40){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `rgb(${Math.max(0,r-a)},${Math.max(0,g-a)},${Math.max(0,b-a)})`;
}
function lighten(hex,a=40){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `rgb(${Math.min(255,r+a)},${Math.min(255,g+a)},${Math.min(255,b+a)})`;
}

// ─── floor label → numeric index ──────────────────────────────────────────────
const FLOOR_ORDER = ['Ground Floor','2nd Floor','3rd Floor','4th Floor','5th Floor'];
function floorIndex(label){ const i=FLOOR_ORDER.indexOf(label); return i>=0?i:0; }

// ─── 3D CANVAS ENGINE ─────────────────────────────────────────────────────────
// Building constants — shared across draw + hitTest
const BLD = {
  // footprint in world units (x=width, z=depth)
  X0: -6, X1: 6,   // 12 units wide
  Z0: -4, Z1: 4,   // 8 units deep
  STORY: 3.6,       // floor-to-floor height
  WALL:  2.8,       // interior clear height
  SLAB:  0.5,       // slab thickness
  // stairwell in the left-rear corner
  ST_X0: -6, ST_X1: -4.2,
  ST_Z0: -4, ST_Z1: -1.8,
  // elevator shaft (right-rear corner, drawn only when has_elevator)
  EL_X0:  4.2, EL_X1: 6,
  EL_Z0: -4,   EL_Z1: -2,
};
// Grid picker cells → world coords
// Grid is COLS×ROWS mapped to building footprint (excluding stair/elevator nooks)
const GRID_COLS = 12, GRID_ROWS = 8;
function gridToWorld(gx, gz, gw, gd) {
  const scaleX = (BLD.X1 - BLD.X0) / GRID_COLS;
  const scaleZ = (BLD.Z1 - BLD.Z0) / GRID_ROWS;
  return {
    x0: BLD.X0 + gx * scaleX,
    z0: BLD.Z0 + gz * scaleZ,
    x1: BLD.X0 + (gx + gw) * scaleX,
    z1: BLD.Z0 + (gz + gd) * scaleZ,
  };
}

function Blueprint3D({ rooms, selectedId, onSelect, hasElevator }){
  const canvasRef = useRef(null);
  const stateRef  = useRef({ rotX:0.38, rotY:0.55, zoom:36, drag:false, lx:0, ly:0, panX:0, panY:0, panMode:false, touchMode:null });
  // All floor indices that have rooms OR exist (to draw empty floors as shell)
  const allFloorNums = useCallback(() => {
    const nums = new Set(rooms.map(r => floorIndex(r.floor || 'Ground Floor')));
    // always include at least floor 0
    nums.add(0);
    return [...nums].sort((a,b)=>a-b);
  }, [rooms]);

  const floorMap = useCallback(() => {
    const map = {};
    for(const r of rooms){
      const fi = floorIndex(r.floor || 'Ground Floor');
      if(!map[fi]) map[fi]=[];
      map[fi].push(r);
    }
    return map;
  }, [rooms]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const W=canvas.width, H=canvas.height;
    ctx.clearRect(0,0,W,H);

    // subtle background gradient
    const bg = ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#edecea'); bg.addColorStop(1,'#f8f7f5');
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

    const { rotX, rotY, zoom } = stateRef.current;
    const fNums = allFloorNums();
    const fMap  = floorMap();
    const { X0,X1,Z0,Z1,STORY,WALL,SLAB,ST_X0,ST_X1,ST_Z0,ST_Z1,EL_X0,EL_X1,EL_Z0,EL_Z1 } = BLD;

    function project(x,y,z){
      const cx=Math.cos(rotY),sx=Math.sin(rotY);
      const cz=Math.cos(rotX),sz=Math.sin(rotX);
      const x2=x*cx-z*sx, z2=x*sx+z*cx;
      const y2=y*cz-z2*sz, z3=y*sz+z2*cz;
      const s=zoom/(zoom*0.18+z3*0.01);
      return [W/2+x2*s+stateRef.current.panX, H*0.52-y2*s+stateRef.current.panY];
    }

    function face(pts, fill, stroke, alpha=0.94){
      ctx.beginPath();
      ctx.moveTo(pts[0][0],pts[0][1]);
      for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0],pts[i][1]);
      ctx.closePath();
      ctx.globalAlpha=alpha;
      ctx.fillStyle=fill; ctx.fill();
      ctx.globalAlpha=1;
      ctx.strokeStyle=stroke||'rgba(0,0,0,0.13)';
      ctx.lineWidth=0.8; ctx.stroke();
    }

    function poly(pts, fill, stroke, alpha){
      // alias
      face(pts, fill, stroke, alpha);
    }

    const totalH = fNums.length * STORY; // full building height

    // ── 1. SHARED OUTER SHELL WALLS (drawn back-to-front once) ────────────────
    // We draw the four outer wall faces of the whole building as one solid mass,
    // then punch rooms into each floor on top of the slab.
    // Bottom of building
    const yBase = 0, yTop = yBase + totalH;

    // Outer wall colours
    const wallFront = '#c9c5bc', wallRight = '#b8b4ab', wallLeft = '#d4d0c8', wallBack = '#bfbbb3';
    const roofCol   = '#d8d5cf';

    // Back-left wall (Z0 face: viewer sees it if rotY is in range)
    const bTL=project(X0,yBase,Z0), bTR=project(X1,yBase,Z0);
    const bBL=project(X0,yBase,Z1), bBR=project(X1,yBase,Z1);
    const tTL=project(X0,yTop, Z0), tTR=project(X1,yTop, Z0);
    const tBL=project(X0,yTop, Z1), tBR=project(X1,yTop, Z1);

    // Draw in painter's order: furthest faces first
    // Back face (Z0)
    face([bTL,bTR,tTR,tTL], wallBack, 'rgba(0,0,0,0.10)');
    // Left face (X0)
    face([bTL,bBL,tBL,tTL], wallLeft, 'rgba(0,0,0,0.08)');
    // Right face (X1)
    face([bTR,bBR,tBR,tTR], wallRight,'rgba(0,0,0,0.12)');
    // Front face (Z1)
    face([bBL,bBR,tBR,tBL], wallFront,'rgba(0,0,0,0.07)');

    // ── 2. FLOOR SLABS + ROOMS per floor ──────────────────────────────────────
    for(const fi of fNums){
      const fy = fi * STORY; // bottom of this floor's interior
      const rms = fMap[fi] || [];

      // ── Floor slab top surface ──────────────────────────────────────────────
      const sy = fy; // slab surface
      {
        const tl=project(X0,sy,Z0), tr=project(X1,sy,Z0);
        const bl=project(X0,sy,Z1), br=project(X1,sy,Z1);
        // Interior floor (lighter inside)
        face([tl,tr,br,bl],'#dedad4','rgba(0,0,0,0.04)');
        // Slab edge (front)
        const tlt=project(X0,sy-SLAB,Z0), trt=project(X1,sy-SLAB,Z0);
        const blt=project(X0,sy-SLAB,Z1), brt=project(X1,sy-SLAB,Z1);
        face([tl,tr,trt,tlt],'#bfbbb3','rgba(0,0,0,0.12)');
        face([tl,tlt,blt,bl],'#cac6bc','rgba(0,0,0,0.06)');
      }

      // ── Floor label floating left ───────────────────────────────────────────
      {
        const lp=project(X0-0.3, fy+WALL*0.5, Z0);
        ctx.save();
        ctx.font=`600 ${Math.max(9,zoom*0.26)}px system-ui,sans-serif`;
        ctx.fillStyle='rgba(80,76,70,0.75)';
        ctx.textAlign='right';
        ctx.fillText(FLOOR_ORDER[fi]||`Floor ${fi}`, lp[0]-4, lp[1]);
        ctx.restore();
      }

      // ── Stairwell box (every floor) ─────────────────────────────────────────
      {
        const sx0=ST_X0, sz0=ST_Z0, sx1=ST_X1, sz1=ST_Z1;
        const y0=fy, y1=fy+WALL;
        const sCol='#8a9bb5';
        const A=project(sx0,y0,sz0),B=project(sx1,y0,sz0);
        const C=project(sx0,y0,sz1),D=project(sx1,y0,sz1);
        const At=project(sx0,y1,sz0),Bt=project(sx1,y1,sz0);
        const Ct=project(sx0,y1,sz1),Dt=project(sx1,y1,sz1);
        // top
        face([At,Bt,Dt,Ct], darken(sCol,10),'rgba(0,0,0,0.12)');
        // front
        face([At,Bt,B,A],   darken(sCol,25),'rgba(0,0,0,0.10)');
        // right
        face([Bt,B,D,Dt],   darken(sCol,40),'rgba(0,0,0,0.12)');
        // left
        face([At,A,C,Ct],   lighten(sCol,20),'rgba(0,0,0,0.06)');
        // stair lines on top
        const steps=5;
        for(let s=0;s<steps;s++){
          const t=s/steps;
          const t1=(s+1)/steps;
          const lx0=(At[0]+Ct[0])/2*(1-t) +(Bt[0]+Dt[0])/2*t;
          const ly0=(At[1]+Ct[1])/2*(1-t) +(Bt[1]+Dt[1])/2*t;
          const lx1=(At[0]+Ct[0])/2*(1-t1)+(Bt[0]+Dt[0])/2*t1;
          const ly1=(At[1]+Ct[1])/2*(1-t1)+(Bt[1]+Dt[1])/2*t1;
          ctx.save();
          ctx.strokeStyle='rgba(255,255,255,0.45)';
          ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(lx0,ly0); ctx.lineTo(lx1,ly1); ctx.stroke();
          ctx.restore();
        }
        // label
        const lx=(At[0]+Bt[0]+Ct[0]+Dt[0])/4;
        const ly=(At[1]+Bt[1]+Ct[1]+Dt[1])/4;
        ctx.save();
        ctx.font=`500 ${Math.max(7,zoom*0.2)}px system-ui`;
        ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('🪜 Stairs', lx, ly);
        ctx.restore();
      }

      // ── Elevator shaft (every floor, only if hasElevator) ──────────────────
      if(hasElevator){
        const ex0=EL_X0, ez0=EL_Z0, ex1=EL_X1, ez1=EL_Z1;
        const y0=fy, y1=fy+WALL;
        const eCol='#7a8fa6';
        const A=project(ex0,y0,ez0),B=project(ex1,y0,ez0);
        const C=project(ex0,y0,ez1),D=project(ex1,y0,ez1);
        const At=project(ex0,y1,ez0),Bt=project(ex1,y1,ez0);
        const Ct=project(ex0,y1,ez1),Dt=project(ex1,y1,ez1);
        // slightly darker/steel colour
        face([At,Bt,Dt,Ct], darken(eCol,5), 'rgba(0,0,0,0.14)');
        face([At,Bt,B,A],   darken(eCol,20),'rgba(0,0,0,0.12)');
        face([Bt,B,D,Dt],   darken(eCol,38),'rgba(0,0,0,0.10)');
        face([At,A,C,Ct],   lighten(eCol,18),'rgba(0,0,0,0.06)');
        // door seam on front face
        {
          const mx=(At[0]+Bt[0])/2, my1=At[1], my2=A[1];
          ctx.save();
          ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=1.2;
          ctx.beginPath(); ctx.moveTo(mx,my1); ctx.lineTo(mx,my2); ctx.stroke();
          ctx.restore();
        }
        const lx=(At[0]+Bt[0]+Ct[0]+Dt[0])/4;
        const ly=(At[1]+Bt[1]+Ct[1]+Dt[1])/4;
        ctx.save();
        ctx.font=`500 ${Math.max(7,zoom*0.2)}px system-ui`;
        ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('🛗 Lift', lx, ly);
        ctx.restore();
      }

      // ── Rooms ───────────────────────────────────────────────────────────────
      // Painter's sort: rooms farther from camera (in projected depth) go first
      const sorted=[...rms].sort((a,b)=>{
        const depth=(r)=>{
          const gx=Number(r.grid_x)||0, gz=Number(r.grid_z)||0;
          const gw=Number(r.grid_w)||2, gd=Number(r.grid_d)||2;
          const w=gridToWorld(gx,gz,gw,gd);
          const cx=(w.x0+w.x1)/2, cz=(w.z0+w.z1)/2;
          return cz*Math.cos(rotY)+cx*Math.sin(rotY);
        };
        return depth(b)-depth(a);
      });

      for(const room of sorted){
        const gx=Number(room.grid_x)||0;
        const gz=Number(room.grid_z)||0;
        const gw=Number(room.grid_w)||2;
        const gd=Number(room.grid_d)||2;
        const { x0,z0,x1,z1 } = gridToWorld(gx,gz,gw,gd);
        const y0=fy, y1=fy+WALL;

        const isSelected=room.id===selectedId;
        const baseCol=cat3d(room.category);
        const col=isSelected?lighten(baseCol,55):baseCol;

        const TL=project(x0,y0,z0), TR=project(x1,y0,z0);
        const BL=project(x0,y0,z1), BR=project(x1,y0,z1);
        const TLt=project(x0,y1,z0), TRt=project(x1,y1,z0);
        const BLt=project(x0,y1,z1), BRt=project(x1,y1,z1);

        // floor patch (subtle)
        face([TL,TR,BR,BL],'rgba(220,218,212,0.5)','rgba(0,0,0,0.03)');
        // top face
        face([TLt,TRt,BRt,BLt], col, 'rgba(0,0,0,0.10)');
        // front face
        face([TLt,TRt,TR,TL], darken(col,22),'rgba(0,0,0,0.12)');
        // right face
        face([TRt,TR,BR,BRt], darken(col,42),'rgba(0,0,0,0.12)');
        // left face
        face([TLt,TL,BL,BLt], lighten(col,16),'rgba(0,0,0,0.07)');

        // window lines on front face
        {
          const wMidY=(TLt[1]+TL[1])/2;
          const wL=(TLt[0]+TL[0])/2, wR=(TRt[0]+TR[0])/2;
          const wMidX=(wL+wR)/2;
          ctx.save();
          ctx.strokeStyle='rgba(255,255,255,0.25)'; ctx.lineWidth=0.8;
          ctx.beginPath(); ctx.moveTo(wMidX,TLt[1]+2); ctx.lineTo(wMidX,TL[1]-2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(wL+4,wMidY); ctx.lineTo(wR-4,wMidY); ctx.stroke();
          ctx.restore();
        }

        // selection ring (dashed white outline on top)
        if(isSelected){
          ctx.save();
          ctx.strokeStyle='#fff'; ctx.lineWidth=2.8;
          ctx.setLineDash([5,3]); ctx.globalAlpha=0.9;
          ctx.beginPath();
          ctx.moveTo(TLt[0],TLt[1]); ctx.lineTo(TRt[0],TRt[1]);
          ctx.lineTo(BRt[0],BRt[1]); ctx.lineTo(BLt[0],BLt[1]);
          ctx.closePath(); ctx.stroke();
          ctx.setLineDash([]); ctx.restore();
        }

        // label on top face
        const lcx=(TLt[0]+TRt[0]+BRt[0]+BLt[0])/4;
        const lcy=(TLt[1]+TRt[1]+BRt[1]+BLt[1])/4;
        const fs=Math.max(7,Math.min(11,zoom*0.24));
        ctx.save();
        ctx.globalAlpha=0.96;
        ctx.font=`600 ${fs}px system-ui,sans-serif`;
        ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle';
        let lbl=room.name||room.category;
        if(lbl.length>13) lbl=lbl.slice(0,12)+'…';
        ctx.fillText(lbl,lcx,lcy);
        ctx.restore();
      }
    }

    // ── 3. ROOF SLAB ──────────────────────────────────────────────────────────
    {
      const yR = fNums.length * STORY; // roof sits on top of last floor
      const roofTL=project(X0,yR,Z0), roofTR=project(X1,yR,Z0);
      const roofBL=project(X0,yR,Z1), roofBR=project(X1,yR,Z1);
      face([roofTL,roofTR,roofBR,roofBL], roofCol, 'rgba(0,0,0,0.10)', 0.90);
      // parapet edges
      const ptl=project(X0,yR+0.4,Z0), ptr=project(X1,yR+0.4,Z0);
      const pbl=project(X0,yR+0.4,Z1), pbr=project(X1,yR+0.4,Z1);
      face([roofTL,roofTR,ptr,ptl],'#c2bfb8','rgba(0,0,0,0.10)');
      face([roofTL,ptl,pbl,roofBL],'#ccc9c2','rgba(0,0,0,0.06)');
    }

    // ── 4. COMPASS ────────────────────────────────────────────────────────────
    {
      const cx=W-36, cy=H-36, cr=20;
      ctx.save();
      ctx.globalAlpha=0.28;
      ctx.beginPath(); ctx.arc(cx,cy,cr,0,Math.PI*2);
      ctx.fillStyle='#444'; ctx.fill();
      ctx.globalAlpha=0.85;
      ctx.font='bold 9px system-ui'; ctx.fillStyle='#fff';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('N',cx,cy-10); ctx.fillText('S',cx,cy+10);
      ctx.fillText('E',cx+10,cy); ctx.fillText('W',cx-10,cy);
      ctx.restore();
    }
  }, [allFloorNums, floorMap, selectedId, hasElevator]);

  // Hit-test the top face of each room
  function hitTest(mx,my){
    const canvas=canvasRef.current; if(!canvas) return null;
    const W=canvas.width, H=canvas.height;
    const{ rotX,rotY,zoom }=stateRef.current;
    const fMap=floorMap();
    const fNums=allFloorNums().slice().reverse(); // top floors first
    const { STORY, WALL } = BLD;

    function project(x,y,z){
      const cx=Math.cos(rotY),sx=Math.sin(rotY);
      const cz=Math.cos(rotX),sz=Math.sin(rotX);
      const x2=x*cx-z*sx; const z2=x*sx+z*cx;
      const y2=y*cz-z2*sz; const z3=y*sz+z2*cz;
      const s=zoom/(zoom*0.18+z3*0.01);
      return[W/2+x2*s+stateRef.current.panX, H*0.52-y2*s+stateRef.current.panY];
    }
    function pip(px,py,poly){
      let inside=false;
      for(let i=0,j=poly.length-1;i<poly.length;j=i++){
        const xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];
        if(((yi>py)!=(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi)) inside=!inside;
      }
      return inside;
    }

    for(const fi of fNums){
      const fy=fi*STORY;
      for(const room of (fMap[fi]||[])){
        const gx=Number(room.grid_x)||0, gz=Number(room.grid_z)||0;
        const gw=Number(room.grid_w)||2, gd=Number(room.grid_d)||2;
        const { x0,z0,x1,z1 } = gridToWorld(gx,gz,gw,gd);
        const y1=fy+WALL;
        const tlt=project(x0,y1,z0),trt=project(x1,y1,z0);
        const brt=project(x1,y1,z1),blt=project(x0,y1,z1);
        if(pip(mx,my,[tlt,trt,brt,blt])) return room;
      }
    }
    return null;
  }

  useEffect(()=>{ draw(); }, [draw]);

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ro=new ResizeObserver(()=>{
      const wrap=canvas.parentElement;
      canvas.width=wrap.offsetWidth;
      canvas.height=Math.max(460,wrap.offsetWidth*0.62);
      draw();
    });
    ro.observe(canvas.parentElement);
    return ()=>ro.disconnect();
  },[draw]);

  function onMouseDown(e){
    e.preventDefault();
    stateRef.current.drag=true;
    stateRef.current.lx=e.clientX;
    stateRef.current.ly=e.clientY;
    // middle (1) or right (2) = pan; left (0) = rotate
    stateRef.current.panMode = e.button === 1 || e.button === 2 || e.shiftKey;
  }
  function onMouseUp(){ stateRef.current.drag=false; }
  function onMouseMove(e){
    if(!stateRef.current.drag) return;
    const dx=e.clientX-stateRef.current.lx, dy=e.clientY-stateRef.current.ly;
    if(stateRef.current.panMode){
      stateRef.current.panX += dx;
      stateRef.current.panY += dy;
    } else {
      stateRef.current.rotY += dx*0.008;
      stateRef.current.rotX = Math.max(-0.05, Math.min(0.9, stateRef.current.rotX+dy*0.005));
    }
    stateRef.current.lx=e.clientX; stateRef.current.ly=e.clientY;
    draw();
  }
  function onClick(e){
    const canvas=canvasRef.current; if(!canvas) return;
    const rect=canvas.getBoundingClientRect();
    const mx=(e.clientX-rect.left)*(canvas.width/rect.width);
    const my=(e.clientY-rect.top)*(canvas.height/rect.height);
    const hit=hitTest(mx,my);
    onSelect(hit||null);
  }

  // Touch
  function onTouchStart(e){
    if(e.touches.length===1){
      stateRef.current.drag=true;
      stateRef.current.touchMode='rotate';
      stateRef.current.lx=e.touches[0].clientX;
      stateRef.current.ly=e.touches[0].clientY;
    }
    if(e.touches.length===2){
      stateRef.current.drag=true;
      stateRef.current.touchMode='pan';
      const x=(e.touches[0].clientX+e.touches[1].clientX)/2;
      const y=(e.touches[0].clientY+e.touches[1].clientY)/2;
      stateRef.current.lx=x;
      stateRef.current.ly=y;
    }
  }
  function onTouchEnd(e){ if(!e.touches?.length) stateRef.current.drag=false; }

  useEffect(()=>{
    const canvas = canvasRef.current;
    if(!canvas) return;

    const onWheel = (e) => {
      e.preventDefault();
      stateRef.current.zoom=Math.max(18,Math.min(90,stateRef.current.zoom-e.deltaY*0.05));
      draw();
    };

    const onTouchMove = (e) => {
      if(!stateRef.current.drag) return;
      if(stateRef.current.touchMode==='pan' && e.touches.length>=2){
        e.preventDefault();
        const x=(e.touches[0].clientX+e.touches[1].clientX)/2;
        const y=(e.touches[0].clientY+e.touches[1].clientY)/2;
        const dx=x-stateRef.current.lx, dy=y-stateRef.current.ly;
        stateRef.current.panX += dx;
        stateRef.current.panY += dy;
        stateRef.current.lx=x;
        stateRef.current.ly=y;
        draw();
        return;
      }
      if(e.touches.length===1){
        e.preventDefault();
        const dx=e.touches[0].clientX-stateRef.current.lx, dy=e.touches[0].clientY-stateRef.current.ly;
        stateRef.current.rotY += dx*0.008;
        stateRef.current.rotX = Math.max(-0.05, Math.min(0.9, stateRef.current.rotX+dy*0.005));
        stateRef.current.lx=e.touches[0].clientX; stateRef.current.ly=e.touches[0].clientY;
        draw();
      }
    };

    canvas.addEventListener('wheel', onWheel, { passive:false });
    canvas.addEventListener('touchmove', onTouchMove, { passive:false });
    return () => {
      canvas.removeEventListener('wheel', onWheel, { passive:false });
      canvas.removeEventListener('touchmove', onTouchMove, { passive:false });
    };
  }, [draw]);

  return (
    <canvas ref={canvasRef}
      style={{ display:'block', width:'100%', cursor:'grab', borderRadius:12 }}
      onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseMove={onMouseMove}
      onMouseLeave={onMouseUp} onClick={onClick}
      onContextMenu={e => e.preventDefault()}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
    />
  );
}

// ─── GRID POSITION PICKER ─────────────────────────────────────────────────────
// A 2D top-down grid for drag-placing a room on a floor.
// The grid (12×8) maps 1:1 to the 3D building footprint via gridToWorld().
function GridPicker({ value, onChange }){
  const COLS=GRID_COLS, ROWS=GRID_ROWS, CELL=28;
  const{ gx=0, gz=0, gw=2, gd=2 }=value||{};

  // Reserved zones in grid coords (stair: cols 0-1 rows 0-2, elevator: cols 10-11 rows 0-1)
  function isForbidden(c,r){
    if(c<=1&&r<=2) return 'stair';
    if(c>=10&&r<=1) return 'elev';
    return null;
  }

  function handleClick(e){
    const rect=e.currentTarget.getBoundingClientRect();
    const col=Math.floor((e.clientX-rect.left)/CELL);
    const row=Math.floor((e.clientY-rect.top)/CELL);
    // Don't let room start in a reserved zone
    const zone=isForbidden(col,row);
    if(zone) return;
    onChange({ gx:Math.min(col,COLS-gw), gz:Math.min(row,ROWS-gd), gw, gd });
  }

  return (
    <div>
      <div style={{ fontSize:11, color:'#aaa', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>
        Grid Position — matches building layout
      </div>
      <div
        onClick={handleClick}
        style={{ position:'relative', width:COLS*CELL, height:ROWS*CELL, background:'#fafaf8', border:'1.5px solid #e8e6e0', borderRadius:8, cursor:'crosshair', overflow:'hidden', userSelect:'none' }}
      >
        {/* grid lines */}
        {Array.from({length:COLS+1}).map((_,i)=>(
          <div key={`v${i}`} style={{ position:'absolute', left:i*CELL, top:0, width:1, height:'100%', background:'#e8e6e0' }} />
        ))}
        {Array.from({length:ROWS+1}).map((_,i)=>(
          <div key={`h${i}`} style={{ position:'absolute', top:i*CELL, left:0, height:1, width:'100%', background:'#e8e6e0' }} />
        ))}
        {/* stairwell zone */}
        <div style={{ position:'absolute', left:0, top:0, width:2*CELL, height:3*CELL, background:'#8a9bb566', borderRadius:2, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
          <span style={{ fontSize:9, fontWeight:700, color:'#4a5568' }}>🪜</span>
        </div>
        {/* elevator zone (only show hint; user can toggle in School Info) */}
        <div style={{ position:'absolute', left:10*CELL, top:0, width:2*CELL, height:2*CELL, background:'#7a8fa655', borderRadius:2, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
          <span style={{ fontSize:9, fontWeight:700, color:'#4a5568' }}>🛗</span>
        </div>
        {/* placed block */}
        <div style={{
          position:'absolute', left:gx*CELL+1, top:gz*CELL+1,
          width:gw*CELL-2, height:gd*CELL-2,
          background:'#1a1a2e', borderRadius:4, opacity:0.85,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <span style={{ color:'#fff', fontSize:10, fontWeight:600 }}>{gw}×{gd}</span>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8, marginTop:8 }}>
        {[
          { label:'X', key:'gx', max:COLS-gw },
          { label:'Z', key:'gz', max:ROWS-gd },
          { label:'Width', key:'gw', min:1, max:COLS-gx },
          { label:'Depth', key:'gd', min:1, max:ROWS-gz },
        ].map(f=>(
          <div key={f.key}>
            <div style={{ fontSize:10, color:'#aaa', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:2 }}>{f.label}</div>
            <input
              type="number" min={f.min||0} max={f.max||COLS} value={value?.[f.key]||0}
              onChange={e=>onChange({...value,[f.key]:Math.max(f.min||0,Math.min(f.max||COLS,Number(e.target.value)))})}
              style={{ ...T.input, padding:'5px 8px', fontSize:12 }}
            />
          </div>
        ))}
      </div>
      <div style={{ fontSize:11, color:'#bbb', marginTop:6 }}>
        🪜 stairwell and 🛗 lift zones are fixed — place rooms around them.
      </div>
    </div>
  );
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function StatusBadge({ status }){
  const s=STATUS_STYLE[status]||{ bg:'#f5f4f0', color:'#888' };
  return <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:s.bg, color:s.color }}>{status}</span>;
}

// ─── ROOM FORM ────────────────────────────────────────────────────────────────
function RoomForm({ initial, onSave, onCancel, saving }){
  const [form, setForm]=useState(initial||{
    name:'', category:'Classroom', floor:'Ground Floor', building:'Main Building',
    capacity:'', status:'Available', notes:'',
    grid_x:0, grid_z:0, grid_w:2, grid_d:2,
  });

  const set=(k,v)=>setForm(p=>({...p,[k]:v}));

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <Field label="Room Name" style={{ gridColumn:'1/-1' }}>
          <input style={T.input} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Room 201, IT Lab 1" />
        </Field>
        <Field label="Category">
          <select style={{ ...T.select, width:'100%' }} value={form.category} onChange={e=>set('category',e.target.value)}>
            {CATEGORIES.map(c=><option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Capacity">
          <input style={T.input} type="number" min="0" value={form.capacity} onChange={e=>set('capacity',e.target.value)} placeholder="0" />
        </Field>
        <Field label="Building">
          <input style={T.input} value={form.building} onChange={e=>set('building',e.target.value)} placeholder="Main Building" />
        </Field>
        <Field label="Floor">
          <select style={{ ...T.select, width:'100%' }} value={form.floor} onChange={e=>set('floor',e.target.value)}>
            {FLOOR_ORDER.map(f=><option key={f}>{f}</option>)}
          </select>
        </Field>
        <Field label="Status" style={{ gridColumn:'1/-1' }}>
          <select style={{ ...T.select, width:'100%' }} value={form.status} onChange={e=>set('status',e.target.value)}>
            {['Available','Occupied','Maintenance'].map(s=><option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      <GridPicker
        value={{ gx:form.grid_x, gz:form.grid_z, gw:form.grid_w, gd:form.grid_d }}
        onChange={v=>setForm(p=>({...p, grid_x:v.gx, grid_z:v.gz, grid_w:v.gw, grid_d:v.gd }))}
      />

      <Field label="Notes">
        <textarea style={{ ...T.input, resize:'vertical', minHeight:52 }} value={form.notes||''} onChange={e=>set('notes',e.target.value)} placeholder="Optional notes…" />
      </Field>

      <div style={{ display:'flex', gap:8 }}>
        <button onClick={()=>onSave(form)} disabled={saving} style={{ ...T.btn('primary'), flex:1, opacity:saving?0.6:1 }}>
          {saving?'Saving…':'Save Room'}
        </button>
        <button onClick={onCancel} style={T.btn('ghost')}>Cancel</button>
      </div>
    </div>
  );
}

// ─── ROOMS MODULE (3D + CRUD) ──────────────────────────────────────────────────
function RoomsTab({ schoolId, notify }){
  const [rooms, setRooms]=useState([]);
  const [hasElevator, setHasElevator]=useState(false);
  const [loading, setLoading]=useState(true);
  const [selected, setSelected]=useState(null);   // room shown in panel
  const [editing, setEditing]=useState(null);      // room being edited (or 'new')
  const [saving, setSaving]=useState(false);
  const [filterFloor, setFilterFloor]=useState('All');
  const [filterCat, setFilterCat]=useState('All');
  const [view, setView]=useState('3d');            // '3d' | 'list'

  useEffect(()=>{ load(); },[]);

  async function load(){
    setLoading(true);
    const [{ data: roomData }, { data: school }] = await Promise.all([
      supabase.from('rooms').select('*').eq('school_id',schoolId).order('floor').order('name'),
      supabase.from('schools').select('has_elevator').eq('id',schoolId).maybeSingle(),
    ]);
    setRooms(roomData||[]);
    setHasElevator(!!school?.has_elevator);
    setLoading(false);
  }

  async function saveRoom(form){
    if(!form.name){ notify('Room name is required','error'); return; }
    setSaving(true);
    const payload={
      school_id:schoolId, name:form.name, category:form.category,
      floor:form.floor, building:form.building||'Main Building',
      capacity:Number(form.capacity)||0, status:form.status, notes:form.notes||'',
      grid_x:form.grid_x||0, grid_z:form.grid_z||0,
      grid_w:form.grid_w||2,  grid_d:form.grid_d||2,
    };
    if(editing==='new'){
      await supabase.from('rooms').insert(payload);
      notify('Room added');
    } else {
      await supabase.from('rooms').update(payload).eq('id',editing.id);
      notify('Room updated');
    }
    setSaving(false);
    setEditing(null);
    setSelected(null);
    load();
  }

  async function deleteRoom(room){
    if(!confirm(`Delete "${room.name}"?`)) return;
    await supabase.from('rooms').delete().eq('id',room.id);
    notify('Room deleted');
    if(selected?.id===room.id) setSelected(null);
    load();
  }

  const usedFloors=[...new Set(rooms.map(r=>r.floor||'Ground Floor'))].sort((a,b)=>floorIndex(a)-floorIndex(b));
  const filtered=rooms.filter(r=>{
    if(filterFloor!=='All'&&r.floor!==filterFloor) return false;
    if(filterCat!=='All'&&r.category!==filterCat) return false;
    return true;
  });

  const byCat=CATEGORIES.reduce((acc,c)=>({ ...acc,[c]:rooms.filter(r=>r.category===c).length }),{});

  // ── Layout: left sidebar (form/panel) + right (3D or list) ──────────────────
  return (
    <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:'1.5rem', alignItems:'start' }}>

      {/* LEFT: room form or detail panel */}
      <div>
        {editing ? (
          <div style={T.card}>
            <h3 style={{ margin:'0 0 1rem', fontSize:14, fontWeight:700 }}>
              {editing==='new'?'Add Room':'Edit Room'}
            </h3>
            <RoomForm
              initial={editing==='new'?null:editing}
              onSave={saveRoom}
              onCancel={()=>setEditing(null)}
              saving={saving}
            />
          </div>
        ) : selected ? (
          <div style={T.card}>
            {/* Room detail */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1rem' }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:'#1a1a2e' }}>{selected.name}</div>
                <div style={{ fontSize:12, color:'#aaa', marginTop:2 }}>{selected.floor} · {selected.building}</div>
              </div>
              <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#aaa', lineHeight:1 }}>×</button>
            </div>

            {/* Category colour strip */}
            <div style={{ height:4, borderRadius:2, background:cat3d(selected.category), marginBottom:'1rem' }} />

            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:'1rem' }}>
              {[
                { label:'Category',  value:`${CAT_ICON[selected.category]||'◫'} ${selected.category}` },
                { label:'Capacity',  value:selected.capacity||'—' },
                { label:'Status',    value:<StatusBadge status={selected.status}/> },
              ].map(r=>(
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13, borderBottom:'1px solid #f5f4f0', paddingBottom:6 }}>
                  <span style={{ color:'#aaa' }}>{r.label}</span>
                  <span style={{ fontWeight:600 }}>{r.value}</span>
                </div>
              ))}
              {selected.notes && (
                <div style={{ fontSize:12, color:'#777', background:'#f5f4f0', borderRadius:8, padding:'8px 10px' }}>{selected.notes}</div>
              )}
            </div>

            {/* Grid info */}
            <div style={{ fontSize:11, color:'#aaa', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>Blueprint Position</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:'1rem' }}>
              {[['X',selected.grid_x||0],['Z',selected.grid_z||0],['W',selected.grid_w||2],['D',selected.grid_d||2]].map(([l,v])=>(
                <div key={l} style={{ background:'#f5f4f0', borderRadius:8, padding:'6px 0', textAlign:'center' }}>
                  <div style={{ fontSize:10, color:'#aaa', fontWeight:700, textTransform:'uppercase' }}>{l}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:'#1a1a2e' }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setEditing(selected)} style={{ ...T.btn('ghost'), flex:1, fontSize:12 }}>Edit</button>
              <button onClick={()=>deleteRoom(selected)} style={{ ...T.btn('danger'), flex:1, fontSize:12 }}>Delete</button>
            </div>
          </div>
        ) : (
          <div style={T.card}>
            <h3 style={{ margin:'0 0 1rem', fontSize:14, fontWeight:700, color:'#1a1a2e' }}>Rooms Overview</h3>
            {/* Category summary */}
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:'1.25rem' }}>
              {CATEGORIES.filter(c=>byCat[c]>0).map(c=>{
                const meta=CAT_COLOR[c]||{ bg:'#f5f4f0', color:'#888', border:'#e8e6e0' };
                return (
                  <div key={c} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 10px', borderRadius:8, background:meta.bg, border:`1px solid ${meta.border}` }}>
                    <span style={{ fontSize:13, color:meta.color, fontWeight:500 }}>{CAT_ICON[c]} {c}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:meta.color }}>{byCat[c]}</span>
                  </div>
                );
              })}
              {rooms.length===0&&<p style={{ color:'#aaa', fontSize:13 }}>No rooms yet. Click "Add Room" below.</p>}
            </div>
            <button onClick={()=>setEditing('new')} style={{ ...T.btn('primary'), width:'100%' }}>+ Add Room</button>
          </div>
        )}

        {/* Quick-add if nothing selected/editing */}
        {!editing && !selected && rooms.length>0 && (
          <button onClick={()=>setEditing('new')} style={{ ...T.btn('ghost'), width:'100%', marginTop:8, fontSize:12 }}>+ Add Room</button>
        )}
      </div>

      {/* RIGHT: 3D view + list */}
      <div>
        {/* toolbar */}
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:'0.75rem', flexWrap:'wrap' }}>
          <div style={{ display:'flex', gap:4, background:'#f5f4f0', borderRadius:10, padding:4 }}>
            {['3d','list'].map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{
                padding:'5px 14px', borderRadius:8, border:'none', fontWeight:600, fontSize:12,
                cursor:'pointer', fontFamily:'inherit',
                background:view===v?'#fff':'transparent',
                color:view===v?'#1a1a2e':'#aaa',
                boxShadow:view===v?'0 1px 4px #00000010':'none',
              }}>{v==='3d'?'3D Blueprint':'List'}</button>
            ))}
          </div>
          {view==='list'&&<>
            <select style={{ ...T.select, fontSize:12 }} value={filterFloor} onChange={e=>setFilterFloor(e.target.value)}>
              <option value="All">All floors</option>
              {usedFloors.map(f=><option key={f}>{f}</option>)}
            </select>
            <select style={{ ...T.select, fontSize:12 }} value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
              <option value="All">All types</option>
              {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
          </>}
          <div style={{ flex:1 }} />
          <span style={{ fontSize:12, color:'#aaa' }}>{rooms.length} rooms total</span>
        </div>

        {view==='3d' ? (
          <div>
            <div style={{ borderRadius:12, overflow:'hidden', border:'1px solid #e8e6e0', background:'#f5f4f0', marginBottom:8, position:'relative' }}>
              {loading ? (
                <div style={{ height:420, display:'flex', alignItems:'center', justifyContent:'center', color:'#aaa', fontSize:13 }}>Loading rooms…</div>
              ) : rooms.length===0 ? (
                <div style={{ height:420, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#aaa', fontSize:13, gap:12 }}>
                  <div style={{ fontSize:32 }}>🏗</div>
                  <div>No rooms added yet.</div>
                  <button onClick={()=>setEditing('new')} style={T.btn('primary')}>Add your first room</button>
                </div>
              ) : (
                <Blueprint3D
                  rooms={rooms}
                  selectedId={selected?.id||null}
                  onSelect={r=>{ setSelected(r); setEditing(null); }}
                  hasElevator={hasElevator}
                />
              )}
            </div>

            {/* Legend */}
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', padding:'4px 2px' }}>
              {Object.entries(CAT_3D).filter(([k])=>k!=='default').map(([cat,col])=>(
                byCat[cat]>0&&(
                  <div key={cat} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#777' }}>
                    <div style={{ width:10, height:10, borderRadius:2, background:col, flexShrink:0 }} />
                    {cat}
                  </div>
                )
              ))}
            </div>
            <div style={{ fontSize:11, color:'#bbb', textAlign:'center', marginTop:4 }}>
              Left-drag to rotate · Right/middle-drag to pan · Scroll to zoom · Click to select
            </div>
          </div>
        ) : (
          /* LIST VIEW */
          <div style={T.card}>
            {loading ? <p style={{ color:'#aaa', fontSize:13 }}>Loading…</p> :
             filtered.length===0 ? <p style={{ color:'#aaa', fontSize:13, textAlign:'center', padding:'2rem' }}>No rooms match the filters.</p> : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:'2px solid #f5f4f0' }}>
                    {['Room','Category','Floor','Capacity','Status',''].map(h=>(
                      <th key={h} style={{ padding:'8px', textAlign:'left', color:'#aaa', fontWeight:700, fontSize:11, textTransform:'uppercase', letterSpacing:'.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r=>(
                    <tr key={r.id} style={{ borderBottom:'1px solid #f5f4f0', background:selected?.id===r.id?'#f5f4f0':'transparent', cursor:'pointer' }}
                      onClick={()=>{ setSelected(r); setEditing(null); }}>
                      <td style={{ padding:'10px 8px', fontWeight:600 }}>{r.name}</td>
                      <td style={{ padding:'10px 8px' }}>
                        <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20,
                          background:CAT_COLOR[r.category]?.bg||'#f5f4f0',
                          color:CAT_COLOR[r.category]?.color||'#888' }}>
                          {CAT_ICON[r.category]} {r.category}
                        </span>
                      </td>
                      <td style={{ padding:'10px 8px', color:'#777' }}>{r.floor}</td>
                      <td style={{ padding:'10px 8px', color:'#777' }}>{r.capacity||'—'}</td>
                      <td style={{ padding:'10px 8px' }}><StatusBadge status={r.status}/></td>
                      <td style={{ padding:'10px 8px' }}>
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={e=>{ e.stopPropagation(); setEditing(r); setSelected(null); }} style={{ ...T.btn('ghost'), padding:'3px 10px', fontSize:11 }}>Edit</button>
                          <button onClick={e=>{ e.stopPropagation(); deleteRoom(r); }} style={{ ...T.btn('danger'), padding:'3px 10px', fontSize:11 }}>Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SCHOOL INFO TAB ─────────────────────────────────────────────────────────
function SchoolInfoTab({ schoolId, notify }){
  const [school, setSchool]=useState(null);
  const [form, setForm]=useState({});
  const [editing, setEditing]=useState(false);
  const [saving, setSaving]=useState(false);
  const [loading, setLoading]=useState(true);

  useEffect(()=>{
    supabase.from('schools').select('*').eq('id',schoolId).maybeSingle()
      .then(({ data })=>{ setSchool(data); setForm(data||{}); setLoading(false); });
  },[]);

  async function save(){
    setSaving(true);
    await supabase.from('schools').update({
      name:form.name, tagline:form.tagline, level:form.level,
      type:form.type, address:form.address, city:form.city,
      province:form.province, email:form.email, phone:form.phone,
      website:form.website, founded:form.founded,
      has_elevator: !!form.has_elevator,
    }).eq('id',schoolId);
    setSaving(false);
    setEditing(false);
    notify('School info updated');
    const{ data }=await supabase.from('schools').select('*').eq('id',schoolId).maybeSingle();
    setSchool(data); setForm(data||{});
  }

  const set=(k,v)=>setForm(p=>({...p,[k]:v}));

  if(loading) return <p style={{ color:'#aaa', fontSize:13 }}>Loading…</p>;

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem', alignItems:'start' }}>
      <div style={T.card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <h3 style={{ margin:0, fontSize:14, fontWeight:700 }}>School Information</h3>
          {!editing
            ? <button onClick={()=>setEditing(true)} style={{ ...T.btn('ghost'), fontSize:12 }}>Edit</button>
            : <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>{ setEditing(false); setForm(school||{}); }} style={{ ...T.btn('ghost'), fontSize:12 }}>Cancel</button>
                <button onClick={save} disabled={saving} style={{ ...T.btn('primary'), fontSize:12, opacity:saving?0.6:1 }}>{saving?'Saving…':'Save'}</button>
              </div>
          }
        </div>
        <Field label="School Name">
          <input style={T.input} value={form.name||''} onChange={e=>set('name',e.target.value)} disabled={!editing} />
        </Field>
        <Field label="Tagline / Motto">
          <input style={T.input} value={form.tagline||''} onChange={e=>set('tagline',e.target.value)} disabled={!editing} placeholder="Optional" />
        </Field>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Field label="Level">
            <select style={{ ...T.select, width:'100%', opacity:editing?1:0.7 }} value={form.level||''} onChange={e=>set('level',e.target.value)} disabled={!editing}>
              <option value="">Select…</option>
              {SCHOOL_LEVELS.map(l=><option key={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="Type">
            <select style={{ ...T.select, width:'100%', opacity:editing?1:0.7 }} value={form.type||''} onChange={e=>set('type',e.target.value)} disabled={!editing}>
              <option value="">Select…</option>
              {SCHOOL_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Founded">
            <input style={T.input} value={form.founded||''} onChange={e=>set('founded',e.target.value)} disabled={!editing} placeholder="e.g. 1985" />
          </Field>
          <Field label="Phone">
            <input style={T.input} value={form.phone||''} onChange={e=>set('phone',e.target.value)} disabled={!editing} />
          </Field>
        </div>
        <Field label="Email">
          <input style={T.input} value={form.email||''} onChange={e=>set('email',e.target.value)} disabled={!editing} />
        </Field>
        <Field label="Website">
          <input style={T.input} value={form.website||''} onChange={e=>set('website',e.target.value)} disabled={!editing} placeholder="https://…" />
        </Field>
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderTop:'1px solid #f5f4f0', marginTop:4 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#1a1a2e' }}>🛗 Elevator / Lift</div>
            <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>Shows an elevator shaft in the blueprint view between floors</div>
          </div>
          <button
            disabled={!editing}
            onClick={()=>set('has_elevator',!form.has_elevator)}
            style={{ padding:'6px 16px', borderRadius:20, border:`1.5px solid ${form.has_elevator?'#1565c0':'#e8e6e0'}`, background:form.has_elevator?'#eef4ff':'#f5f4f0', color:form.has_elevator?'#0f3460':'#aaa', fontWeight:700, fontSize:12, cursor:editing?'pointer':'not-allowed', fontFamily:'inherit', opacity:editing?1:0.6 }}>
            {form.has_elevator ? 'Yes — Has Elevator' : 'No Elevator'}
          </button>
        </div>
      </div>

      <div style={T.card}>
        <h3 style={{ margin:'0 0 1.25rem', fontSize:14, fontWeight:700 }}>Location</h3>
        <Field label="Street Address">
          <input style={T.input} value={form.address||''} onChange={e=>set('address',e.target.value)} disabled={!editing} />
        </Field>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Field label="City">
            <input style={T.input} value={form.city||''} onChange={e=>set('city',e.target.value)} disabled={!editing} />
          </Field>
          <Field label="Province">
            <input style={T.input} value={form.province||''} onChange={e=>set('province',e.target.value)} disabled={!editing} />
          </Field>
        </div>

        {/* Preview card */}
        {school&&(
          <div style={{ marginTop:'1.5rem', padding:'1rem', background:'#f5f4f0', borderRadius:12 }}>
            <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Fraunces',Georgia,serif", color:'#1a1a2e' }}>{school.name||'—'}</div>
            {school.tagline&&<div style={{ fontSize:12, color:'#aaa', marginTop:2 }}>{school.tagline}</div>}
            <div style={{ marginTop:10, display:'flex', gap:8, flexWrap:'wrap' }}>
              {school.level&&<span style={{ ...T.pill('#eef4ff','#0f3460','#b5d4f4') }}>{school.level}</span>}
              {school.type&&<span style={{ ...T.pill('#f5f4f0','#555','#e8e6e0') }}>{school.type}</span>}
            </div>
            {school.city&&<div style={{ fontSize:12, color:'#aaa', marginTop:8 }}>📍 {school.city}{school.province?`, ${school.province}`:''}</div>}
          </div>
        )}
      </div>
      <div style={{ marginTop: '1.5rem', padding: '1rem', background: school?.is_published ? '#dcfce7' : '#f5f4f0', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: school?.is_published ? '#15803d' : '#1a1a2e' }}>
            {school?.is_published ? '🟢 Published to Directory' : '⚪ Not Published'}
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
            {school?.is_published
              ? 'Guests can find and view your school in the public directory.'
              : 'Publish to make your school visible in the public directory.'}
          </div>
        </div>
        <button
          onClick={async () => {
            const next = !school?.is_published;
            await supabase.from('schools').update({ is_published: next }).eq('id', schoolId);
            setSchool(p => ({ ...p, is_published: next }));
            notify(next ? 'School published to directory!' : 'School unpublished.');
          }}
          style={{ ...T.btn(school?.is_published ? 'ghost' : 'primary'), fontSize: 12, whiteSpace: 'nowrap' }}
        >
          {school?.is_published ? 'Unpublish' : 'Publish School'}
        </button>
      </div>
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
function TabBar({ tabs, active, onChange }){
  return (
    <div style={{ display:'flex', gap:4, background:'#f5f4f0', borderRadius:10, padding:4, marginBottom:'1.5rem' }}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>onChange(t.id)} style={{
          flex:1, padding:'8px 12px', borderRadius:8, border:'none', fontWeight:600,
          fontSize:13, cursor:'pointer', fontFamily:'inherit',
          background:active===t.id?'#fff':'transparent',
          color:active===t.id?'#1a1a2e':'#aaa',
          boxShadow:active===t.id?'0 1px 4px #00000010':'none',
        }}>{t.label}</button>
      ))}
    </div>
  );
}

export default function SchoolAdmin({ notify }){
  const { profile }=useAuth();
  const schoolId=profile?.school_id;
  const [tab, setTab]=useState('rooms');

  if(!schoolId) return (
    <div style={T.card}>
      <p style={{ color:'#aaa', fontSize:13 }}>No school associated with your account.</p>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:'1.5rem' }}>
        <h2 style={{ margin:0, fontSize:20, fontWeight:700, fontFamily:"'Fraunces',Georgia,serif" }}>School Administration</h2>
        <p style={{ margin:'4px 0 0', fontSize:13, color:'#aaa' }}>Manage school info and building blueprint</p>
      </div>
      <TabBar
        tabs={[
          { id:'rooms', label:'🏗 Building Blueprint' },
          { id:'info',  label:'🏫 School Info' },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab==='rooms' && <RoomsTab schoolId={schoolId} notify={notify} />}
      {tab==='info'  && <SchoolInfoTab schoolId={schoolId} notify={notify} />}
    </div>
  );
}