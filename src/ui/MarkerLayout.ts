export interface MarkerBox {x:number;y:number;width:number;height:number;full:boolean}
interface Slot {offset:number;full:boolean;generation:number}
/** Screen-space presentation only: reusable occupancy grid and remembered rows. */
export class MarkerLayout {
  private cells=new Uint8Array(0);
  private columns=0;
  private width=0;
  private height=0;
  private generation=0;
  private readonly slots=new Map<number,Slot>();
  private readonly offsets=[0,-20,20,-40,40,-60,60];
  reset():void {this.slots.clear();this.cells.fill(0);this.generation=0;}
  begin(width:number,height:number):void {
    this.width=width;this.height=height;this.columns=Math.ceil(width/16);
    const count=this.columns*Math.ceil(height/12);
    if(this.cells.length!==count)this.cells=new Uint8Array(count);else this.cells.fill(0);
    this.generation++;
    // Bound history without per-frame full-map scans; forgotten labels reflow normally.
    if(this.generation%120===0)for(const [id,slot] of this.slots)if(this.generation-slot.generation>120)this.slots.delete(id);
  }
  reserve(box:Readonly<{x:number;y:number;width:number;height:number}>):void {
    this.cover(box.x,box.y,box.width,box.height,true);
  }
  place(id:number,anchorX:number,anchorY:number,width:number,extraHeight=0,selected=false):MarkerBox|null {
    const height=18+extraHeight,baseY=anchorY-23;
    const previous=this.slots.get(id),left=Math.max(2,Math.min(this.width-width-2,anchorX-width/2));
    const accept=(x:number,y:number,w:number,full:boolean,offset:number):MarkerBox|null=>{
      if(x<0||y<0||x+w>this.width||y+height>this.height||this.cover(x-2,y-1,w+4,height+2,false))return null;
      this.cover(x-2,y-1,w+4,height+2,true);
      this.slots.set(id,{offset,full,generation:this.generation});return {x,y,width:w,height,full};
    };
    // A full label keeps its prior relative row while the camera moves.
    if(previous?.full){const held=accept(left,baseY+previous.offset,width,true,previous.offset);if(held)return held;}
    for(const offset of this.offsets){const full=accept(left,baseY+offset,width,true,offset);if(full)return full;}
    // Compact icons remain mouse-selectable when names cannot fit. Selected units
    // get more full-label rows because they are placed before ordinary units.
    const compactX=Math.max(2,Math.min(this.width-26,anchorX-12));
    for(let i=0;i<(selected?this.offsets.length:5);i++){
      const offset=this.offsets[i];
      const compact=accept(compactX,baseY+offset,24,false,offset);if(compact)return compact;
    }
    return null;
  }
  private cover(x:number,y:number,width:number,height:number,write:boolean):boolean {
    const x0=Math.max(0,Math.floor(x/16)),x1=Math.min(this.columns-1,Math.floor((x+width)/16));
    const y0=Math.max(0,Math.floor(y/12)),y1=Math.min(Math.ceil(this.height/12)-1,Math.floor((y+height)/12));
    for(let row=y0;row<=y1;row++)for(let col=x0;col<=x1;col++){
      const i=row*this.columns+col;if(write)this.cells[i]=1;else if(this.cells[i])return true;
    }
    return false;
  }
}
