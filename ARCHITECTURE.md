# Doc2HTML Architecture

## 项目概述

这是一个企业级的文档到 HTML 转换架构，支持组件系统、受众过滤和性能优化。

## 核心设计原则

### 1. 模块化组件系统
- 每个渲染元素是独立的组件
- 支持自定义组件注册
- 组件可组合和扩展

### 2. 受众过滤
- 根据受众类型动态隐藏或显示内容
- 支持多级受众规则
- 性能优化的过滤策略

### 3. 性能优化
- 内置缓存机制
- 延迟加载和脚本延迟
- HTML 最小化选项
- 性能指标收集

## 架构组件

```
src/
├── renderer.ts           # 核心渲染引擎
├── api.ts               # REST API 接口
├── index.ts             # 导出入口
├── components/
│   └── registry.ts      # 组件注册表
├── services/
│   ├── audience-filter.ts # 受众过滤服务
│   └── performance.ts    # 性能优化服务
└── utils/
    └── logger.ts        # 日志工具
```

## 主要特性

### DocumentRenderer
- 支持文档结构渲染
- 可配置的主题
- 受众级别过滤
- 性能指标收集

### ComponentRegistry
- 动态组件注册
- 版本控制
- 组件元数据管理

### AudienceFilter
- 支持多种过滤规则
- 性能优化的过滤策略
- 受众组合支持

### PerformanceOptimizer
- HTML 最小化
- 延迟加载图片
- 脚本延迟加载
- 性能指标收集

## 使用示例

```typescript
import { DocumentRenderer, RenderOptions } from 'doc2html-arch';

const renderer = new DocumentRenderer();

const options: RenderOptions = {
  theme: 'light',
  audiences: ['premium', 'vip'],
  minify: true,
  enableCache: true
};

const result = await renderer.render(document, options);
console.log(result.html);
console.log(result.metadata);
```

## 扩展点

### 添加新组件
继承 ComponentDefinition 并注册到 ComponentRegistry

### 添加自定义过滤规则
实现 AudienceRule 接口并添加到 AudienceFilter

### 添加性能优化
在 PerformanceOptimizer 中扩展优化方法

## 性能指标

系统自动收集以下指标：
- 渲染时间 (render_time)
- HTML 大小
- 缓存命中率
- 过滤处理时间

## 日志

使用 Logger 工具记录：
- 信息级别 (info): 正常操作
- 错误级别 (error): 异常情况
- 调试级别 (debug): 详细信息
