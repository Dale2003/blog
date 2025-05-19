前言：大二数电课实验报告，具体时间不知道了，图片也找不到了。

## 实验要求

### 多功能显示控制器

对实验2多功能显示控制器的功能进行二次扩展。在模式1和模式2的基础上，增加第三种工作模式，即模式3篮球记分牌。即多功能显示控制器将有选择地路由以下三组数字中的一组，用于驱动四个七段数码管：

·模式1：拨位开关sw [15:0] 的值

·模式2：一个以10Hz频率自动递增的计数器的计数值

·模式3：受按键（上键BTNU、下键BTND、左键BTNL和右键BTNR）控制的甲、乙两队篮球比赛得分记录显示，格式为十六进制

显示规则如下：中间键BTNC键用于多功能显示器工作模式的切换。缺省状态下，控制器默认工作在模式1，即四个七段数码管的显示基于所有16个拨位开关sw的值；若按下中间键BTNC，则控制器工作模式旋转到模式2，即七段数码管显示简单计数器的计数值；再次按下中间键BTNC，则控制器工作模式旋转到模式3，即七段数码管显示的是甲、乙两队篮球比赛得分。若第3次按下BTNC键（中间键），则控制器重新回到模式1，如此循环下去……

### Scoreboard 记分牌显示控制器

设计一个四位16进制篮球比赛记分牌：用两组16进制数分别表示甲、乙两队篮球比赛得分，每组有2位16进制码，能显示0到255的得分。

如图所示，电路输入有五个输入Clk、Rst、Inc、Dec和Toggle。Rst用右键BTNR表示，功能是 将两队得分清零；Inc用上键BTNU表示，功能是得分加1；Dec用下键BTND表示，功能是得分减1；Toggle用左键BTNL表示，其功能是甲、乙两队得分控制切换。例如，若当前输入Inc和Dec控制的是甲队得分，则按下Toggle键后，Inc和Dec的功能切换为对乙队得分进行增减，再次按下Toggle键，则重新回到控制甲队得分。

按键开关在闭合和断开时，触点会存在弹跳现象（也称震颤或抖动）。当按键开关按下或释放时，可能会在触点上弹跳，从而产生高频on—off—on—off信号。因此，按键按下或者释放的时候都会出现一段不稳定的弹跳时间。触点弹跳不仅和按键自身的机械结构、几何形状、材料属性有关，也与操作者动作的轻重快慢相有关。操作者通常注意不到这一点，但100MHz的数字系统对此非常敏感。如果不处理好弹跳时间，就无法采样到稳定有效的按键信号值。因此，你的设计必须能有效地消除按键弹跳。

## 原理框图

**记分板模块**


## 源代码

### 顶层模块

```verilog
`timescale 1ns/1ns
module basys3_board
	(
		// clk or rst 
		input clk_in,
		input rst_in,

		// display output
		input [15:0] sw_in,
		input [3:0] button_in,
		
		// display output
		output [15:0] led_out,
		output [3:0] seg_en_out,
		output [6:0] seven_seg_out
	);

	// wire and reg definitions
	// debug 
	// top level state machine

	reg [16:0] count0;
	reg [9:0] count1;
	reg clk_10;
	reg clk_1k;
    
	always @ (posedge clk_in)
	begin
		if(rst_in) begin
			count0 <= 0;
			count1 <= 0;
			clk_1k <= 1'b0;
			clk_10 <= 1'b0;
		end else begin
			clk_1k <= 1'b0;
			clk_10 <= 1'b0;
			if(count0==17'd100000-1)
			begin
				count0 <= 17'd0;
				clk_1k <= 1'b1;
				if(count1==10'd100-1)
				begin
					count1 <= 10'd0;
					clk_10 <= 1'b1;
				end else
					count1 <= count1 + 1;
			end else
				count0 <= count0 + 1;
		end
	end
	reg [15:0] value;
	reg [3:0] Thds;
	reg [3:0] Hrds;
	reg [3:0] Tens;
	reg [3:0] Ones;
	always @(posedge clk_10 or posedge rst_in) begin
    if(rst_in)begin
        Thds <= 0;
        Hrds <= 0;
        Tens <= 0;
        Ones <= 0;
    end else begin
        if(Ones<4'd9) Ones <= Ones + 1;
        if(Thds==4'd9 && Hrds==4'd9 && Tens==4'd9 && Ones==4'd9) begin
            Thds<=4'd0;
            Hrds<=4'd0;
            Tens<=4'd0;
            Ones<=4'd0;
        end
        else if(Hrds==4'd9 && Tens==4'd9 && Ones==4'd9) begin
            Hrds<=4'd0;
            Tens<=4'd0;
            Ones<=4'd0;
            Thds<=Thds+1;
        end
        else if(Tens==4'd9 && Ones==4'd9) begin
            Tens<=4'd0;
            Ones<=4'd0;
            Hrds<=Hrds+1;
        end
        else if(Ones==4'd9) begin
            Ones<=4'd0;
            Tens<=Tens+1;
        end
    end
end
    wire center;
    reg [1:0] flagcnt;
    always@(posedge clk_in)begin
    if(center==1)begin
        flagcnt<=flagcnt+1;
        end
    if(flagcnt==3)begin
        flagcnt<=0;
        end
	end
	reg [1:0] seg_addr;
	reg [3:0] seg_data;
	// swap the 7-seg-led
	always @ (posedge clk_in)
	begin
			if(clk_1k)begin
				seg_addr <= seg_addr + 1;
			end
	end
	
	
	reg [15:0] iled_out;
    assign led_out = iled_out;
    
	wire up,down,left;
	wire [7:0] a;
	wire [7:0] b;
	wire leda,ledb;
	always @ (seg_addr)
	begin
	if(flagcnt==1) begin
		case(seg_addr)
			2'b00 : seg_data <= Ones;
			2'b01 : seg_data <= Tens;
			2'b10 : seg_data <= Hrds;
			2'b11 : seg_data <= Thds;
			default : seg_data <= 4'b0;
		endcase
		iled_out[10]<=0;
        iled_out[14]<=0;
		end
	if(flagcnt==0) begin
		case(seg_addr)
			2'b00 : seg_data <= sw_in[3:0];
			2'b01 : seg_data <= sw_in[7:4];
			2'b10 : seg_data <= sw_in[11:8];
			2'b11 : seg_data <= sw_in[15:12];
			default : seg_data <= 4'b0;
		endcase
		end
		iled_out[10]<=0;
        iled_out[14]<=0;
		if(flagcnt==2) begin
			case(seg_addr)
                2'b00 : seg_data <= a[3:0];
                2'b01 : seg_data <= a[7:4];
                2'b10 : seg_data <= b[3:0];
                2'b11 : seg_data <= b[7:4];
                default : seg_data <= 4'b0;
            endcase
            iled_out[10]<=leda;
            iled_out[14]<=ledb;
		end
		
	end

	seven_seg_disp com_seven_seg_disp 
	(
		.clk_in(clk_in),
		.rst_in(rst_in),

		.seg_addr_in(seg_addr),
		.seg_din(seg_data),

		.seg_en_out(seg_en_out),
		.seven_seg_out(seven_seg_out)
	);
	
	debounce debouncecenter
	(
	   .clk(clk_in),
	   .rst(rst_in),
	   .bouncey_in(button_in[1]),
	   .clean_out(center)
	);
	
	debounce debounceup
	(
	   .clk(clk_in),
	   .rst(rst_in),
	   .bouncey_in(button_in[2]),
	   .clean_out(up)
	);
	
	debounce debouncedown
	(
	   .clk(clk_in),
	   .rst(rst_in),
	   .bouncey_in(button_in[3]),
	   .clean_out(down)
	);
	
	debounce debounceleft
	(
	   .clk(clk_in),
	   .rst(rst_in),
	   .bouncey_in(button_in[0]),
	   .clean_out(left)
	);
	
	score myscore
	(
	   .clk(clk_in),
	   .rst(rst_in),
	   .inc(up),
	   .dec(down),
	   .toggle(left),
	   .teama_score(a),
	   .teamb_score(b),
	   .leda(leda),
	   .ledb(ledb)
	);
endmodule

```

### seven_seg_disp模块

```verilog
`timescale 1ns/1ns
module seven_seg_disp
	(
		// clk or rst 
		input clk_in,
		input rst_in,

		// seg in
		input [1:0] seg_addr_in,
		input [3:0] seg_din,

		output reg [3:0] seg_en_out,
		output reg [6:0] seven_seg_out
	);

	always @(seg_addr_in)
	begin
		case(seg_addr_in)
			2'b00 : seg_en_out = 4'b1110;
			2'b01 : seg_en_out = 4'b1101;
			2'b10 : seg_en_out = 4'b1011;
			2'b11 : seg_en_out = 4'b0111;
			default : seg_en_out = 4'b1110;
		endcase
	end

	always @(seg_din)
	begin
		case(seg_din)
			4'h0 : seven_seg_out = 7'b100_0000;
			4'h1 : seven_seg_out = 7'b111_1001;
			4'h2 : seven_seg_out = 7'b010_0100;
			4'h3 : seven_seg_out = 7'b011_0000;
			4'h4 : seven_seg_out = 7'b001_1001;
			4'h5 : seven_seg_out = 7'b001_0010;
			4'h6 : seven_seg_out = 7'b000_0010;
			4'h7 : seven_seg_out = 7'b111_1000;
			4'h8 : seven_seg_out = 7'b000_0000;
			4'h9 : seven_seg_out = 7'b001_0000;
			4'hA : seven_seg_out = 7'b000_1000;
			4'hB : seven_seg_out = 7'b000_0011;
			4'hC : seven_seg_out = 7'b100_0110;
			4'hD : seven_seg_out = 7'b010_0001;
			4'hE : seven_seg_out = 7'b000_0110;
			4'hF : seven_seg_out = 7'b000_1110;
			default : seven_seg_out = 7'b100_0000;
		endcase
	end
endmodule
```

### 计分板模块

```verilog
module score (
input clk, // Clock
input inc, dec, rst, toggle, // Buttons
output reg [7:0] teama_score, teamb_score, // Score regs
output reg leda, ledb // Led lights indication
);
reg flag=0;
always@(posedge clk) begin
    if(rst)begin
        teama_score<=0;
        teamb_score<=0;
        end
    if(toggle)begin
        flag<=flag+1;
        end
    if(flag==0)begin
        leda<=1;
        ledb<=0;
        if(inc)begin
            teama_score<=teama_score+1;
            end
        if(dec)begin
            teama_score<=teama_score-1;
            end
        end
     if(flag==1)begin
        leda<=0;
        ledb<=1;
        if(inc)begin
            teamb_score<=teamb_score+1;
            end
        if(dec)begin
            teamb_score<=teamb_score-1;
            end
       end
end
endmodule
```

### debounce模块

```verilog
module debounce( input clk, rst, bouncey_in,//raw input
output wire clean_out //debounced output
);
reg [19:0] count=20'b0; // is 20 bits enough?
reg old_clean=0;
reg clean=0;
always @(posedge clk) begin
    if(rst)begin
    count<=0;
    clean<=0;
    end else
        if(bouncey_in)begin
            if(count==20'd1000000)begin
                clean<=1;
                end else begin
                count<=count+1;
                clean<=0;
                end
            end else begin
            count<=0;
            clean<=0;
            end
        end
    
 //Edge detector

//signal that indicates a "rising edge":
assign clean_out = clean & (!old_clean);
always @(posedge clk)begin
    if (rst)begin
        old_clean <= 1'b0;
        end else begin
            old_clean <= clean;
        end
    end
endmodule
```

### 管脚约束文件

``` verilog
#create_clock -name clk_in -period 10ns [get_ports clk_in]

set_property -dict {PACKAGE_PIN W5 IOSTANDARD LVCMOS33} [get_ports clk_in]
set_property -dict {PACKAGE_PIN T17 IOSTANDARD LVCMOS33} [get_ports rst_in]

# button input
set_property -dict {PACKAGE_PIN W19 IOSTANDARD LVCMOS33} [get_ports {button_in[0]}]
set_property -dict {PACKAGE_PIN U18 IOSTANDARD LVCMOS33} [get_ports {button_in[1]}]
set_property -dict {PACKAGE_PIN T18 IOSTANDARD LVCMOS33} [get_ports {button_in[2]}]
set_property -dict {PACKAGE_PIN U17 IOSTANDARD LVCMOS33} [get_ports {button_in[3]}]

# sw input
set_property -dict {PACKAGE_PIN V17 IOSTANDARD LVCMOS33} [get_ports {sw_in[0]}]
set_property -dict {PACKAGE_PIN V16 IOSTANDARD LVCMOS33} [get_ports {sw_in[1]}]
set_property -dict {PACKAGE_PIN W16 IOSTANDARD LVCMOS33} [get_ports {sw_in[2]}]
set_property -dict {PACKAGE_PIN W17 IOSTANDARD LVCMOS33} [get_ports {sw_in[3]}]
set_property -dict {PACKAGE_PIN W15 IOSTANDARD LVCMOS33} [get_ports {sw_in[4]}]
set_property -dict {PACKAGE_PIN V15 IOSTANDARD LVCMOS33} [get_ports {sw_in[5]}]
set_property -dict {PACKAGE_PIN W14 IOSTANDARD LVCMOS33} [get_ports {sw_in[6]}]
set_property -dict {PACKAGE_PIN W13 IOSTANDARD LVCMOS33} [get_ports {sw_in[7]}]
set_property -dict {PACKAGE_PIN V2 IOSTANDARD LVCMOS33} [get_ports {sw_in[8]}]
set_property -dict {PACKAGE_PIN T3 IOSTANDARD LVCMOS33} [get_ports {sw_in[9]}]
set_property -dict {PACKAGE_PIN T2 IOSTANDARD LVCMOS33} [get_ports {sw_in[10]}]
set_property -dict {PACKAGE_PIN R3 IOSTANDARD LVCMOS33} [get_ports {sw_in[11]}]
set_property -dict {PACKAGE_PIN W2 IOSTANDARD LVCMOS33} [get_ports {sw_in[12]}]
set_property -dict {PACKAGE_PIN U1 IOSTANDARD LVCMOS33} [get_ports {sw_in[13]}]
set_property -dict {PACKAGE_PIN T1 IOSTANDARD LVCMOS33} [get_ports {sw_in[14]}]
set_property -dict {PACKAGE_PIN R2 IOSTANDARD LVCMOS33} [get_ports {sw_in[15]}]

#led_out[15:0]
set_property -dict {PACKAGE_PIN L1 IOSTANDARD LVCMOS33} [get_ports {led_out[15]}]
set_property -dict {PACKAGE_PIN P1 IOSTANDARD LVCMOS33} [get_ports {led_out[14]}]
set_property -dict {PACKAGE_PIN N3 IOSTANDARD LVCMOS33} [get_ports {led_out[13]}]
set_property -dict {PACKAGE_PIN P3 IOSTANDARD LVCMOS33} [get_ports {led_out[12]}]
set_property -dict {PACKAGE_PIN U3 IOSTANDARD LVCMOS33} [get_ports {led_out[11]}]
set_property -dict {PACKAGE_PIN W3 IOSTANDARD LVCMOS33} [get_ports {led_out[10]}]
set_property -dict {PACKAGE_PIN V3 IOSTANDARD LVCMOS33} [get_ports {led_out[9]}]
set_property -dict {PACKAGE_PIN V13 IOSTANDARD LVCMOS33} [get_ports {led_out[8]}]
set_property -dict {PACKAGE_PIN V14 IOSTANDARD LVCMOS33} [get_ports {led_out[7]}]
set_property -dict {PACKAGE_PIN U14 IOSTANDARD LVCMOS33} [get_ports {led_out[6]}]
set_property -dict {PACKAGE_PIN U15 IOSTANDARD LVCMOS33} [get_ports {led_out[5]}]
set_property -dict {PACKAGE_PIN W18 IOSTANDARD LVCMOS33} [get_ports {led_out[4]}]
set_property -dict {PACKAGE_PIN V19 IOSTANDARD LVCMOS33} [get_ports {led_out[3]}]
set_property -dict {PACKAGE_PIN U19 IOSTANDARD LVCMOS33} [get_ports {led_out[2]}]
set_property -dict {PACKAGE_PIN E19 IOSTANDARD LVCMOS33} [get_ports {led_out[1]}]
set_property -dict {PACKAGE_PIN U16 IOSTANDARD LVCMOS33} [get_ports {led_out[0]}]


set_property -dict {PACKAGE_PIN W4 IOSTANDARD LVCMOS33} [get_ports {seg_en_out[3]}]
set_property -dict {PACKAGE_PIN V4 IOSTANDARD LVCMOS33} [get_ports {seg_en_out[2]}]
set_property -dict {PACKAGE_PIN U4 IOSTANDARD LVCMOS33} [get_ports {seg_en_out[1]}]
set_property -dict {PACKAGE_PIN U2 IOSTANDARD LVCMOS33} [get_ports {seg_en_out[0]}]

set_property -dict {PACKAGE_PIN U7 IOSTANDARD LVCMOS33} [get_ports {seven_seg_out[6]}]
set_property -dict {PACKAGE_PIN V5 IOSTANDARD LVCMOS33} [get_ports {seven_seg_out[5]}]
set_property -dict {PACKAGE_PIN U5 IOSTANDARD LVCMOS33} [get_ports {seven_seg_out[4]}]
set_property -dict {PACKAGE_PIN V8 IOSTANDARD LVCMOS33} [get_ports {seven_seg_out[3]}]
set_property -dict {PACKAGE_PIN U8 IOSTANDARD LVCMOS33} [get_ports {seven_seg_out[2]}]
set_property -dict {PACKAGE_PIN W6 IOSTANDARD LVCMOS33} [get_ports {seven_seg_out[1]}]
set_property -dict {PACKAGE_PIN W7 IOSTANDARD LVCMOS33} [get_ports {seven_seg_out[0]}]


create_clock -period 10.000 -name clk_in -waveform {0.000 5.000} [get_ports clk_in]
```











