前言：大二数电课实验报告，具体时间不知道了，图片也找不到了。

## 实验要求

1. 设计一个Binary-to-7-Segment译码器模块，将二进制数转换成七段码。它有4比特输入SW3、SW2、SW1、SW0，7比特输出 a、b、c、d、e、f、g，分别用于控制七段码显示器的7个LED发光管。根据输入组合的不同，译码器将驱动点亮 LED 相应的段，数码管就能显示与输入二进制码相对应的数字。例如，若输入组合为 1111，则译码器输出是abcdefg=1000111，显示16进制数字“F”；若输入组合为0000，译码器输出是 abcdefg = 1111110，即点亮除了数码管g以外的所有各个LED发光二极管，从而显示16进制数字”0”。

2. 在上述基础上，在设计一个二进制码交替显示控制模块，将它与前面的模块整合在一起，实现Binary-to-7-Segment交替显示功能：将拨位开关 SW15~SW0（SW0 代表 LSB）代表的16进制数val_in[15:0]，用于驱动四个数码管显示。

3. 多功能显示控制器。为更好地体现设计效果，对上述设计进行修改和扩展。seven_seg_controller不再直接由 sw[15:0]决定，而是存在以下两个选项：
   模式1：拨位开关sw[15:0]的值；
   模式2：一个以10Hz频率自动递增的16比特计数器的计数值。

4. 扩展：为方便读数，把16进制计数器改写成了10进制，另外加入了另两个显示模块，分别显示两个图案。

   ## 原理框图及简要文字说明

   程序的总原理框图如下：

   逻辑图如下：

   其中按键输入模块采用了简易的按键消抖，即检测按下按键后延时300ms产生输出信号。数码管显示模块中采用了1kHz的刷新频率。拨位开关输入直接把输入的16位二进制分为四组，作为四个16进制数，分别对应四个位置的数码管显示。计数器采用了十进制进位计数，以10Hz自动递增。下面是10Hz计数器的简要逻辑图。

   下面是切换控制的状态图。

## 源代码及必要注释

``` verilog
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

	reg [16:0] count0;
	reg [9:0] count1;
	reg clk_10;
	reg clk_1k;
    
	always @ (posedge clk_in) //时钟分频（1kHz&10Hz）
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
	always @(posedge clk_10 or posedge rst_in) begin     //十进制计数器
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
    
    reg [1:0] flag=0;     //简易按键消抖&切换控制
    reg [3:0] t0;
    always@(clk_in)begin
    if(rst_in) begin
			flag<=0;
			t0<=0;
		end else begin
        if(button_in!=4'd0)begin
            if(clk_10) t0<=t0+1;
            if(t0>=4'd4) begin
                t0<=4'd0;
                flag<=flag+1;
            end 
        end
        end
    end
	
	// component map 
	wire [7:0] vio_prob_in;
	wire [7:0] vio_prob_out;
	vio_0 com_vio
	(
		.clk(clk_in),
		.probe_in0(vio_prob_in),
		.probe_out0(vio_prob_out)
	);
	
	reg [1:0] seg_addr;
	reg [3:0] seg_data;

	
	always @ (posedge clk_in)   //七段数码管的扫描
	begin
		if(rst_in)begin
			seg_addr <= 2'b00;
		end else begin
			if(clk_1k)begin
				seg_addr <= seg_addr + 1;
			end
		end
	end

	always @ (seg_addr)  //七段数码管的显示
	begin
	if(flag==1) begin    //10Hz十进制计数器
		case(seg_addr)
			2'b00 : seg_data <= Ones;
			2'b01 : seg_data <= Tens;
			2'b10 : seg_data <= Hrds;
			2'b11 : seg_data <= Thds;
			default : seg_data <= 4'b0;
		endcase
		end
	if(flag==0) begin   //拨位开关显示
	    case(seg_addr)
			2'b00 : seg_data <= sw_in[3:0];
			2'b01 : seg_data <= sw_in[7:4];
			2'b10 : seg_data <= sw_in[11:8];
			2'b11 : seg_data <= sw_in[15:12];
			default : seg_data <= 4'b0;
		endcase
		end
		if(flag==2) begin  //显示图案"Dale"
	    case(seg_addr)
			2'b00 : seg_data <= 14;
			2'b01 : seg_data <= 1;
			2'b10 : seg_data <= 10;
			2'b11 : seg_data <= 13;
			default : seg_data <= 4'b0;
		endcase
		end
		if(flag==3) begin  //显示图案"EIE"
	    case(seg_addr)
			2'b00 : seg_data <= 14;
			2'b01 : seg_data <= 1;
			2'b10 : seg_data <= 14;
			2'b11 : seg_data <= 0;
			default : seg_data <= 4'b0;
		endcase
		end
	end

	
	seven_seg_disp com_seven_seg_disp //七段译码器模块的调用
	(
		.clk_in(clk_in),
		.rst_in(rst_in),

		.seg_addr_in(seg_addr),
		.seg_din(seg_data),

		.seg_en_out(seg_en_out),
		.seven_seg_out(seven_seg_out)
	);
	
endmodule
```

其中七段译码器模块如下：

``` verilog
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

管脚约束文件如下：

``` verilog
set_property -dict {PACKAGE_PIN W5 IOSTANDARD LVCMOS33} [get_ports clk_in]
set_property -dict {PACKAGE_PIN U18 IOSTANDARD LVCMOS33} [get_ports rst_in]

# button input
set_property -dict {PACKAGE_PIN W19 IOSTANDARD LVCMOS33} [get_ports {button_in[0]}]
set_property -dict {PACKAGE_PIN T17 IOSTANDARD LVCMOS33} [get_ports {button_in[1]}]
set_property -dict {PACKAGE_PIN T18 IOSTANDARD LVCMOS33} [get_ports {button_in[2]}]
set_property -dict {PACKAGE_PIN U17 IOSTANDARD LVCMOS33} [get_ports {button_in[3]}]
set_property -dict {PACKAGE_PIN U18 IOSTANDARD LVCMOS33} [get_ports {button_in[4]}]

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

