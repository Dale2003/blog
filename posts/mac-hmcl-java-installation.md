> 本教程记录了在macOS系统上安装并运行HMCL（Hello Minecraft! Launcher）的完整过程，包括Java环境的配置和遇到的问题解决方案。

## 1. 初始环境检查

首先，我需要检查系统中是否已经安装了Java环境。通过以下命令查看Java版本：

```bash
java -v  # 尝试查看版本但命令不正确
java -version  # 正确的查看Java版本命令
```

通过检查发现系统中的Java环境可能存在问题或未正确安装。

## 2. 检查Java安装路径

接下来，我检查了macOS中Java的安装情况：

```bash
/usr/libexec/java_home -V  # 列出所有已安装的Java版本
```

然后查看了Java的安装目录：

```bash
cd ./Library
cd Java
ls
```

## 3. 配置JavaFX环境

下载JavaFX，地址在[https://gluonhq.com/products/javafx/](https://gluonhq.com/products/javafx/)

配置JavaFX的路径：

```bash
export PATH_TO_FX=/Users/dale/Downloads/javafx-sdk-24.0.1/lib
```

## 4. 尝试运行HMCL

下载HMCL后，我尝试使用不同的方法运行它：

```bash
# 尝试直接运行jar文件
java -jar /Users/dale/Downloads/HMCL-3.6.12.jar 

# 尝试使用JavaFX模块运行
java --module-path $PATH_TO_FX --add-modules javafx.controls,javafx.fxml,javafx.web,javafx.swing -jar HMCL-3.6.12.jar
```

这些尝试都没有成功，可能是因为Java版本不兼容或JavaFX配置问题。

## 5. 清理旧版Java组件

尝试清理系统中可能存在冲突的旧版Java组件：

```bash
sudo rm -rf /Library/Internet\ Plug-Ins/JavaAppletPlugin.plugin
sudo rm -rf /Library/PreferencePanes/JavaControlPanel.prefPane
```

## 6. 使用Homebrew安装OpenJDK

决定使用Homebrew重新安装更新的Java版本：

```bash
# 安装OpenJDK 17
brew install openjdk@17

# 配置环境变量
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"

# 更新shell配置
source ~/.zshrc
```

安装后验证Java版本：

```bash
java -version
```

## 7. 尝试更新版本的Java

由于HMCL可能需要更新的Java版本，我尝试安装了OpenJDK 21：

```bash
brew install openjdk@21

# 配置Java 21环境变量
export JAVA_HOME="/opt/homebrew/opt/openjdk@21"
export PATH="$JAVA_HOME/bin:$PATH"

# 更新shell配置
source ~/.zshrc
```

## 8. 更改JavaFX版本

发现JavaFX版本下高了，可能需要匹配的JavaFX版本，下载并配置了JavaFX 21：

```bash
export PATH_TO_FX=/Users/dale/Downloads/javafx-sdk-21.0.7/lib
```

## 9. 使用jenv管理多个Java版本

为了更好地管理多个Java版本，安装并配置了jenv：

```bash
brew install jenv

# 添加Java 21到jenv
jenv add /opt/homebrew/opt/openjdk@21
jenv global 21
```

## 10. 配置持久环境变量

为了使配置在重启后仍然有效，编辑了shell配置文件：

```bash
nano ~/.zshrc
```

在配置文件中添加了以下内容：
```
export JAVA_HOME="/opt/homebrew/opt/openjdk@21"
export PATH="$JAVA_HOME/bin:$PATH"
export PATH_TO_FX=/Users/dale/Downloads/javafx-sdk-21.0.7/lib
```

## 11. 创建启动脚本

为了简化启动过程，创建了一个可执行的启动脚本：

```bash
cd Desktop
vim launch-hmcl.command
chmod +x launch-hmcl.command
```

启动脚本内容大致如下：
```bash
#!/bin/bash

# 设置 JavaFX 模块路径（根据实际路径修改）
PATH_TO_FX="/Users/dale/Downloads/javafx-sdk-21.0.7/lib"

# 设置 JAVA_HOME（确保你已经安装 Java 21，并设置好）
export JAVA_HOME="/opt/homebrew/opt/openjdk@21"
export PATH="$JAVA_HOME/bin:$PATH"

# 执行 HMCL 启动命令
java --module-path "$PATH_TO_FX" \
     --add-modules javafx.controls,javafx.web,javafx.swing \
     -jar ~/Downloads/HMCL-3.6.12.jar

```

## 12. 成功运行HMCL

最终，通过双击桌面上的启动脚本或在终端中执行以下命令，成功启动了HMCL：

```bash
/Users/dale/Desktop/launch-hmcl.command
```

## 总结

在macOS上安装并运行HMCL的过程涉及以下几个关键步骤：

1. 安装正确版本的Java（本例中是OpenJDK 21）
2. 安装匹配版本的JavaFX库
3. 正确配置环境变量
4. 创建启动脚本简化启动过程

这个过程中遇到了一些问题，主要是Java版本兼容性和JavaFX依赖的配置问题，但最终通过正确的配置和启动脚本解决了这些问题。