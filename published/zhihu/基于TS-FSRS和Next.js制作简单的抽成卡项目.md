## 介绍
为了能够抵消遗忘曲线的影响，在有了FSRS算法以后，还需要一个能根据FSRS调度的时间来展示笔记数据，并能够可视化的进行下一次调度。
`ts-fsrs-demo`是一个简单的demo，最初的初衷是为了学习`プログラミング必須英単語600+`的单词并且修复`ts-fsrs`在实际项目中可能存在的问题而制作的项目。`ts-fsrs-demo`能够让开发者做出类似于背单词那样的抽成卡web项目，利用`Vercel`和`Planetscale`进行部署和存储数据实现多用户登录和多设备使用功能。

# 基础条件
`ts-fsrs-demo`尽量少用依赖，减少门槛，但不可避免的使用了以下依赖：
```bash
prisma (global) npm install -g prisma # 与数据库交互的ORM框架
dotenv (global) npm install -g dotenv # 加载环境参数
next.js (>= 14.2.0) # React的框架
next-auth（>= 4.24.5） # 鉴权框架
ts-fsrs (>= 3.2.1) # FSRS调度算法实现（TypeScript实现的ESM/CJS版）
tailwindcss (>= 3)
daisyui (>= 4.4.22) # 最流行Tailwind CSS的组件库
```
因此本文章希望读者具备以下的基础条件：
- 掌握React的Hooks和Context的基本知识
- 了解Next.js的App Router构建项目和~~Server Actions(非必要)~~
- 了解prisma的基本知识
- 了解一定的MySQL的基本知识
- 了解基本的next-auth的oauth知识（不构建多用户登录项目则非必要）
## 预备文章
- 【FSRS】基于TS-FSRS的数据库表设计 - 小石子的文章 - 知乎
https://zhuanlan.zhihu.com/p/672558313
- 【FSRS】TS-FSRS的工作流 - 小石子的文章 - 知乎
https://zhuanlan.zhihu.com/p/673902928

其中涉及Next.js相关的文章：
- 【Next.js】在实际工作中使用Server Actions的技巧【转】 - 小石子的文章 - 知乎
https://zhuanlan.zhihu.com/p/670134897


## 安装demo项目

为了更好的学习该项目，请先将项目clone到本地后尝试运行
```bash
git clone https://github.com/ishiko732/ts-fsrs-demo.git
```
下载完后请使用npm或pnpm或yarn进行安装依赖
```
npm install -g prisma
npm install -g dotenv
npm install
```
其中`-g`表示全局安装，由于demo的prisma文件不是放在默认位置上，所以需要使用`dotenv`来加载环境变量的参数。
![[Pasted image 20240114160412.png]]

安装完成后新建一个`.env.local`，内容需要包含：
```bash
DATABASE_URL="mysql://{dbUserName}:{dbPassword}:3306/{dbSchema}" # init database

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=xxxxxxx # openssl rand -base64 32

GITHUB_ID=xxxx # GitHub clientId
GITHUB_SECRET=xxxxxxx # GitHub clientSecret
GITHUB_ADMIN_ID=xxxx #GitHub user id
```

### 初始化数据库

初始化数据库表结构（将会根据`src/prisma/schema.prisma`来初始化）：
```bash
npm run dbpush
```

![[Pasted image 20240114160749.png]]
当看到类似的消息则表示初始化成功了

### 初始化next-auth
从`ts-fsrs-demo`的v2.0.0版本开始，默认使用了`next-auth`作为划分用户信息并使用了`GitHub OAuth`作为识别用户身份。
所以初始化Next-auth，我们需要在Github上申请一个`OAuth app`：
- https://github.com/settings/developers (`GitHub Developer Settings`)
- 选择`New Oauth App`

填写以下内容，完成创建操作：
![[Pasted image 20240114162334.png]]

```
Homepage URL: http://localhost:3000/
Authorization callback URL: http://localhost:3000/api/auth/callback/github
```

点击`Generate a new client secret`完成创建`clientSecret`
![[Pasted image 20240114162501.png]]
现在我们知道了`clientId`和`clientSecret`后，可以在`.env.local`填写好信息：
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=xxxxxxx # openssl rand -base64 32

GITHUB_ID=dd81b0fb27ce977bdcbd # GitHub clientId 文章发布后已删除，请勿使用该Id
GITHUB_SECRET=ffaffd296afcc0d46b28447655b2a9ac84508263 # GitHub clientSecret 文章发布后已删除，请勿使用该Secret
```

然后利用`openssl rand -base64 32`生成`NEXTAUTH_SECRET`,后填写到`.env.local`
![[Pasted image 20240114162817.png]]

> `GITHUB_ADMIN_ID`在demo项目中并没有实际上用到，所以这里不展开，这个id是将你的GitHub账号设置为管理员

> 在首次登录时会自动注册信息，并将`プログラミング必須英単語600+`的笔记内容导入。


# 抽成卡实现
## 1.扩展TS-FSRS的类型
在[src/types.d.ts](https://github.com/ishiko732/ts-fsrs-demo/blob/main/src/types.d.ts)中：
- 根据[基于TS-FSRS的数据库表设计](https://zhuanlan.zhihu.com/p/672558313),为了能够匹配`Prisma`我们对`ts-fsrs`模块的接口进行了一定的扩展`CardPrisma`，`RevlogPrisma`
![[Pasted image 20240114164846.png]]
- 根据[TS-FSRS的工作流](https://zhuanlan.zhihu.com/p/673902928)，新增了`StateBox类型
![[Pasted image 20240114164214.png]]

## 2.FSRS类型与Prisma类型互换
由于TS-FSRS的类型存在不匹配情况，所以需要进行封装一次类型转换，在[src/vendor/fsrsToPrisma/index.ts](https://github.com/ishiko732/ts-fsrs-demo/tree/v2.1.2/src/vendor/fsrsToPrisma/index.ts)中，实现了FSRS类型与Prisma类型互换：
- createEmptyCardByPrisma：创建新的卡片
- transferPrismaCardToCard：Prisma类型转回FSRS类型
- stateFSRSStateToPrisma：FSRS的状态类型转为Prisma的状态类型
- stateFSRSRatingToPrisma：FSRS的评分类型转为Prisma的评分类型

## 3.实现卡片交互操作 （Next.js服务端与页面交互）
`ts-fsrs-demo`会在服务端上完成数据初始化读取后，在客户端组件上进行水合`hydration`操作，所以需要使用状态管理。`ts-fsrs-demo`采用`React.createContext`来创建状态管理(有兴趣的读者可以采用`Jotai`，`Mobx`，`Redux`来进行状态管理)。

### FSRS参数交互
在登录以后允许用户自定义自己的FSRS参数。
![[Pasted image 20240114203227.png]]

 > 字段信息可参考：
 > - 【FSRS】基于TS-FSRS的数据库表设计 - 小石子的文章 - 知乎https://zhuanlan.zhihu.com/p/672558313

| 字段名 | 字段解释 |
| ---- | ---- |
| request_retention | 记忆概率；代表你想要的目标记忆的概率。注意，在较高的保留率和较高的重复次数之间有一个权衡。建议你把这个值设置在0.8和0.9之间。 |
| maximum_interval | 最大间隔天数；复习卡片间隔的最大天数。 当复习卡片的间隔达到此天数时， 「困难」、「良好」和「简单」的间隔将会一致。 此间隔越短，工作量越多。 |
| w | FSRS优化器权重；通过运行FSRS优化器(目前有[fsrs-optimizer](https://link.zhihu.com/?target=https%3A//github.com/open-spaced-repetition/fsrs-optimizer)，[fsrs4anki](https://link.zhihu.com/?target=https%3A//github.com/open-spaced-repetition/fsrs4anki)，[fsrs-rs](https://link.zhihu.com/?target=https%3A//github.com/open-spaced-repetition/fsrs-rs)可使用)创建的参数。默认情况下，这些是由样本数据集计算出来的权重。 |
| enable_fuzz | 启用抖动；当启用时，这将为新的间隔时间增加一个小的随机延迟，以防止卡片粘在一起，总是在同一天被复习。 |


设计思路：
- 利用next-auth读取Session的userId信息，读取用户当前的FSRS参数,并通过`defaultValue`回显数据
- 在点击`Save`调用`Server Actions`或请求API保存参数

```jsx
<input name="request_retention" className="input input-bordered w-full"
	type="number" max={0.99} min={0.7} step={0.01}
	defaultValue={params.params.request_retention} />
```

> 采用`defaultValue`而不采用`State`，`Ref`是为了保证该组件不是客户端组件，避免在服务端组件出现使用了客户端组件的情况。

以下是`src/components/settings/FSRSConfig.tsx`采用`Server Actions`实现的：
![[Pasted image 20240114204233.png]]
![[Pasted image 20240116111200.png]]

> 如果是请求API，则修改`submit`方法，在内部使用`fetch("/api/xxx")`来实现保存参数操作。

![[Pasted image 20240114171714.png]]
为了减少不必要的数据读取，我们使用`queryRaw`执行自己写的SQL语句来获取FSRS的参数：
```sql
select * from Parameters
where uid=(select uid from Note
		   where nid in (select nid from Card 
						 where cid=${Number(cid)}))
```
并且在参数存在的时候调用`processArrayParameters`完成类型转换。

> 注意：queryRaw 返回的均为`T[]`
### 初始化卡片数据
一进入到`http://localhost:3000/card` 页面，将会展示当天所要学习/复习的卡片信息：
![[Pasted image 20240116103539.png]]

它会根据[TS-FSRS的工作流](https://zhuanlan.zhihu.com/p/673902928)，采用三盒子模型，并采用SSR方式读取数据。

设计思路：
- 读取next-auth的userId信息
- 获取当前时间
	- 如果当前时间<4:00(`UTC+0`)，则取昨天
	- 如果当前时间>=4:00(`UTC+0`)，则取今天
- 读取当天已学习的新卡片数量和新卡片当天最大限制(用户设定的限制)
- 读取笔记数据（根据状态设置筛选条件）
- 求和计算笔记集合，判断是否已结束

> 提示：如果要根据用户的时区信息，可以将读取卡片数据滞后到客户端水合完毕以后，或者读取该用户最后一次复习记录的复习时间，根据那个时间读取UTC/GMT时区信息（需要修改review字段添加`@UTC`注解）

[src/app/card/page.tsx](https://github.com/ishiko732/ts-fsrs-demo/tree/v2.1.2/src/app/card/page.tsx)：
![[Pasted image 20240114204857.png]]
![[Pasted image 20240114205818.png]]

![[Pasted image 20240116210026.png]]
读取当天已复习数量采用`queryRaw`来获取：
```sql
select count(log.cid) as total 
from Revlog log
left join Card c on c.cid = log.cid
left join Note n on n.nid = c.nid
where n.uid=${Number(uid)} and log.state='0' and log.review between ${startOfDay} and ${nextDay}
```
> `log.state='0'`表明这卡片为新卡片，该卡复习时间为当天范围内。
> 
> 注意：目前这样多用户下库表设计还在思考是否存在问题：是否要将uid字段添加到Revlog

### 初始化卡片状态管理和操作

在`CardClient`的最外层使用了`CardProvider`来保证内层组件都可以访问`CardContext`的值。
![[Pasted image 20240114210219.png]]


首先需要将服务器上读取到的数据进行转换为三盒子模型，并设定：
- `open`当前状态为不显示答案信息
- `schedule`当前卡片调度信息为未定义`undefined`
- `currentType`读取指向的盒子是哪个
![[Pasted image 20240114211005.png]]


`CardProvider` 会在点击评分按钮时触发：
- 请求获取下一张卡片调度情况
- 对数据进行随机排序，其中学习中卡片盒子则是会根据调度时间排序
- 记录当前复习操作到操作回滚栈
- 发送到服务器保存复习记录信息
- 检查是否已结束当日的复习

### 请求获取下一张卡片调度情况
![[Pasted image 20240114212055.png]]
首次加载，点击评分按钮，回滚卡片都会执行读取调度情况操作。
![[Pasted image 20240114211510.png]]
将采用请求API(`/api/fsrs[POST]`)的方式获取调度信息。
![[Pasted image 20240116104134.png]]

> 注意：ts-fsrs的repeat方法有一个**隐藏特性**：会原封不动的保留传入字段，除了ts-fsrs调度需要的卡片Card字段会被修正。
> 例如：你在传入时存在cid，nid，note信息，但是ts-fsrs的card类型并不会出现这些字段，则会保留下来，返回时也会返回


![[Pasted image 20240114211649.png]]

> 在服务器上执行的原因是：
> 1. 采用不信任式模式，即客户端不直接调度卡片
> 2. 保证所有数据的时区均是服务器的时区（也可以使用api传入的now时间做为时区，这就要修改prisma的时间字段 添加`@UTC`注解）



### 对数据进行随机排序
在每次点击完评分按钮后将会执行数据排序
![[Pasted image 20240114212055.png]]
![[Pasted image 20240114211946.png]]
### 记录当前复习操作到操作回滚栈

完成回滚栈初始化状态：
![[Pasted image 20240114212432.png]]

在每次点击完评分按钮后将会执行入栈操作：
![[Pasted image 20240114212851.png]]
这里的nextStateBox是三盒子模型的状态，所以不存在`State.Relearning`这个状态，三盒子状态下将`State.Relearning`的数据归并到`State.Learning`中。


在按下快捷键`Ctrl+Z`或者`⌘+Z`时触发回滚操作将采用请求API的方式获取回滚后的信息。
![[Pasted image 20240114213331.png]]
![[Pasted image 20240116105544.png]]

> 注意：ts-fsrs的`rollback`方法有一个**隐藏特性**：会原封不动的保留传入字段，除了ts-fsrs回滚需要的卡片Card和Revlog字段会被修正。
> 例如：你在传入时存在cid，nid，note信息，但是ts-fsrs的card类型并不会出现这些字段，则会保留下来，返回时也会返回

![[Pasted image 20240114213250.png]]

在屏幕小的时候则会显示出按钮（虽然我感觉很难看，但为了功能完整性还是加上了）
![[Pasted image 20240116105418.png]]


### 发送到服务器保存复习记录信息
`CardProvider`中，设计了`handleSchdule`方法，传入评分数据后进行调度，将获取到的数据执行`CardProvider`的`handleChange`方法。

![[Pasted image 20240116105950.png]]
其中：
- `nextDue`来判断是否还是当日的数据
- `nextState`:Grade是卡片状态，用于判断该卡片是否已结束，还是要放到学习中盒子下
- `nid`：用于回滚卡片使用 （文章中nid=cid=153只是碰巧原因而已）

![[Pasted image 20240116100347.png]]
### 检查是否已完成当日的复习
![[Pasted image 20240116110959.png]]
通过checkFinished方法来判断当前是否已完成当日复习，当未结束时将`currentType`指向非空的盒子
![[Pasted image 20240114214027.png]]
![[Pasted image 20240114214042.png]]

## 4.实现卡片基本操作（数据库与TS-FSRS交互）

在[src/lib/card.ts](https://github.com/ishiko732/ts-fsrs-demo/tree/v2.1.2/src/lib/card.ts)中，我们实现了卡片相关的查找，调度，忘记，回滚等操作。
### 查找卡片
![[Pasted image 20240114170750.png]]
我们通过Prisma根据`cid`来查找卡片，并返回包含笔记信息，并将返回类型设为`CardPrisma`

### 调度卡片

要完成调度卡片操作，我们需要读取卡片cid或者笔记nid，并根据当前时间来进行调度。
![[Pasted image 20240114171021.png]]
在第49，50行中：
- 我们读取了该用户的FSRS参数
- 利用了`next-auth`来判断该uid是否有权限访问该卡片
```typescript
import { options } from "@/auth/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth/next";
import type { User } from "next-auth";

type SessionProps = {
	expires: string;
	user?: User;
};
export async function getAuthSession() {
	const session = await getServerSession(options);
	return session as SessionProps | null;
}

export async function isAdminOrSelf(uid: number) {
	const session = await getAuthSession();
	return session?.user?.role === "admin" || session?.user?.id === String(uid);
}
```

当所有条件判断完以后，我们调用fsrs，并将用户的FSRS参数传入，调用repeat进行调度，并返回调度的结果。

> 注意：ts-fsrs的`repeat`方法，会原封不动的保留传入字段，除了ts-fsrs调度需要的卡片字段
> 例如：你在传入时存在cid，note信息，但是ts-fsrs的card类型并不会出现这些字段，则会保留下来
### 忘记卡片
![[Pasted image 20240114174151.png]]
通过调用fsrs.forget可以实现忘记卡片，需要传递已复习的卡片信息和当前时间，还有可选项是否重置已复习的次数

![[Pasted image 20240114173019.png]]
跟调度卡片一样，都是读取卡片，判断权限，再传入用户的FSRS参数。不同的是第168行使用的方法为forget，返回的结果是`recordItem`。
```typescript
type RecordLogItem = {
	card: Card;
	log: ReviewLog;
};
```

> 注意：ts-fsrs的`forget`方法，会原封不动的保留传入字段，除了ts-fsrs调度需要的卡片字段
> 例如：你在传入时存在cid，note信息，但是ts-fsrs的card类型并不会出现这些字段，则会保留下来
### 回滚卡片
![[Pasted image 20240114174308.png]]
通过调用fsrs.rollback可以实现回滚上一次操作，需要传递已复习的卡片信息和最新的复习记录。


![[Pasted image 20240114173535.png]]
![[Pasted image 20240114173852.png]]
跟调度卡片一样，都是读取卡片，判断权限，再传入用户的FSRS参数。
不同的是
- 第117行需要读取最后一次`Revlog`记录
- 第132行使用的方法为rollback

## 5.读取笔记
在`http://localhost:3000/note`中，我们可以看到当前用户所用户的笔记信息：
![[Pasted image 20240116113123.png]]
> 注意：开发者模式下右边菜单存在2个不必要的子项，但不会影响到生产模式
> ![[Pasted image 20240116114341.png]]

[src/app/note/page.tsx](https://github.com/ishiko732/ts-fsrs-demo/tree/v2.1.2/src/app/note/page.tsx)中，我们根据当前session所记录的uid和搜索关键词进行读取笔记集合，并进行分类操作。
![[Pasted image 20240116113718.png]]

## 6.读取复习记录
在`http://localhost:3000/note/{nid}`中，我们需要读取笔记信息和笔记的复习记录：
![[Pasted image 20240116115150.png]]

在[src/app/note/[nid]/page.tsx](https://github.com/ishiko732/ts-fsrs-demo/tree/v2.1.2/src/app/note/%5Bnid%5D/page.tsx)中，我们通过读取nid以及判断该笔记的uid是否为自己的，如果没有权限的话禁止访问，否则读取复习记录。
![[Pasted image 20240116115721.png]]

#### 忘记卡片
在点击忘记卡片时，会触发`forgetAction`使其变回新卡片
![[Pasted image 20240116140140.png]]

![[Pasted image 20240116140249.png]]




# 部署

目前`ts-fsrs-demo`使用了`PlanetScale`作为数据库、`Cloudflare`作为域名商，通过Github进行自动化部署到`Vercel`中。

## fork仓库
在GitHub中，完成fork仓库：
```
https://github.com/ishiko732/ts-fsrs-demo
```

![[Pasted image 20240116160926.png]]

![[Pasted image 20240116160957.png]]

## 导入到Vercel
到`Vercel`上，安装`ts-fsrs-demo`
![[Pasted image 20240116161116.png]]

## 修改编译设置

在`Build and Output Settings`中，修改`Build Command`为：
```bash
prisma generate && next build
```
![[Pasted image 20240116161257.png]]

## 获取数据库访问参数
到`Planetscale`的`Dashboard`中，选择`Connect`新增一个连接：
![[Pasted image 20240116164109.png]]

选择`Role:Read/Write`，后点击`Create Password`生成密钥信息：
![[Pasted image 20240116164213.png]]

![[Pasted image 20240116164328.png]]
点击复制按钮复制数据库连接`DATABASE_URL`的参数。

> 首次初始化数据库表建议在本地使用`Admin`角色，并修改`DATABASE_URL`参数后使用`npm run dbpush`完成初始化库表


## 添加环境变量
在`Environment Variables`中设置以下相关参数（本地与`.env.local`一致）：
```bash
DATABASE_URL : xxx  ### MySQL数据库地址
NEXTAUTH_SECRET : xxx # openssl rand -base64 32
GITHUB_ID : xxx # github clientId
GITHUB_SECRET : xxx  # github clientSecret 
GITHUB_ADMIN_ID : xxx # github User Id
```
![[Pasted image 20240116161715.png]]

![[Pasted image 20240116161848.png]]

## 最后部署工作
添加完环境变量后点击`Deploy`进行部署项目，尽情等候一段时间则会显示部署成功：
![[Pasted image 20240116162355.png]]
让我们点击`Continue to Dashboard`,完成最后的配置工作：
![[Pasted image 20240116162618.png]]
复制这个`Domains`的地址，然后转到`Settings->Environment Variables`添加以下内容：
```bash
NEXTAUTH_URL : https://ts-fsrs-demo-sepia.vercel.app/
```
![[Pasted image 20240116162923.png]]


好了，你现在可以通过`https://ts-fsrs-demo-sepia.vercel.app/`（该部署资源已删除）现在访问你部署的`ts-fsrs-demo`了。

## 关联自己的域名

转到`Settings->Domains` ，在输入框里输入自己的域名，并点击`Add`
![[Pasted image 20240116163343.png]]
![[Pasted image 20240116163450.png]]

提示我们未成功配置，我们需要到`Cloudflare`去配置DNS和SSL：
![[Pasted image 20240116163700.png]]
```
Type Name Value
CNAME fsrs cname.vercel-dns.com.
```


![[Pasted image 20240116163731.png]]
需要选择`Full`模式，否则无法访问到项目。

当配置完成以后，回到Vercel，你则可以看到通过测试：
![[Pasted image 20240116163837.png]]
那么你则可以通过[fsrs.parallelveil.com](https://fsrs.parallelveil.com/)进行访问该项目。