/**
 * 简单的JS版输入法，拿来玩玩还而已，没有多大实际使用意义
 * simple-input-method.js
 */
var SimpleInputMethod = {
	hanzi: '', // 候选汉字
	pinyin: '', // 候选拼音
	result: [], // 当前匹配到的汉字集合
	pageCurrent: 1, // 当前页
	pageSize: 5, // 每页大小
	pageCount: 0, // 总页数
	onshift: false, //
	zhong: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
	                           <rect width="24" height="24" fill="none" />
	                           <path fill="currentColor" d="m17.934 3.036l1.732 1L18.531 6H21v2h-2v4h2v2h-2v7h-2v-7h-3.084c-.325 2.862-1.564 5.394-3.37 7.193l-1.562-1.27c1.52-1.438 2.596-3.522 2.917-5.922L10 14v-2l2-.001V8h-2V6h2.467l-1.133-1.964l1.732-1L14.777 6h1.444zM5 13.803l-2 .536v-2.071l2-.536V8H3V6h2V3h2v3h2v2H7v3.197l2-.536v2.07l-2 .536V18.5A2.5 2.5 0 0 1 4.5 21H3v-2h1.5a.5.5 0 0 0 .492-.41L5 18.5zM17 8h-3v4h3z" />
                            </svg>`,
	eng: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                    	<rect width="24" height="24" fill="none" />
                    	<path fill="currentColor" d="M14 10h2v.757a4.5 4.5 0 0 1 7 3.743V20h-2v-5.5c0-1.43-1.174-2.5-2.5-2.5S16 13.07 16 14.5V20h-2zm-2-6v2H4v5h8v2H4v5h8v2H2V4z" /></svg>`,
	/**
	 * 初始化字典配置
	 */
	initDict: function() {
		var dict = window.pinyinUtil.dict;
		//console.log('one:'+JSON.stringify(dict));
		if (!dict.py2hz) throw '未找到合适的字典文件！';
		// 这一步仅仅是给字母a-z扩充，例如根据b找不到相关汉字，就把bi的结果赋值给b
		// 当然这种方式只是很简单的实现，真正的拼音输入法肯定不能这么简单处理
		//var local_dict =GM_getValue('local_dict');
		chrome.storage.local.get('local_dict', function(data) {
			var local_dict = data.local_dict || '';
			console.log(local_dict);
			if (local_dict == '') {
				dict.py2hz2 = {};
				dict.py2hz2['i'] = 'i'; // i比较特殊，没有符合的汉字，所以特殊处理
				dict.py2hz2['u'] = 'u'; // i比较特殊，没有符合的汉字，所以特殊处理
				dict.py2hz2['v'] = 'v'; // i比较特殊，没有符合的汉字，所以特殊处理
				for (var i = 97; i <= 123; i++) {
					var ch = String.fromCharCode(i);
					if (!dict.py2hz[ch]) {
						for (var j in dict.py2hz) {
							if (j.indexOf(ch) == 0) {
								dict.py2hz2[ch] = dict.py2hz[j];
								break;
							}
						}
					}
				}
				chrome.storage.local.set({
					local_dict: dict
				}, function() {
					if (chrome.runtime.lastError) {
						console.error('Error saving to local storage:', chrome.runtime.lastError);
					} else {
						console.log('local_dict saved successfully');
					}
				});
				//GM_setValue("local_dict",dict);
			} else {
				Object.assign(dict, local_dict); //把后面赋值到前面
			}
			//console.log(dict.py2hz2)
		});
		
	},
	/**
	 * 初始化DOM结构
	 */
	initDom: function(twoinit = 'one') {
		if (document.getElementById('simle_input_method') != null) {
			return; //加载前先判断是否存在
		}
		var temp = `<div class="pinyin" style="color:#0364CD;text-align:left;border-bottom: solid 1px #B5C5D2;padding: 4px 10px;font-weight: bold;"></div>
                        <div class="py_result" style="padding: 4px 10px 4px 0px;">
                            <ol style="margin: 0;padding: 0;display: inline-block;vertical-align: middle;"></ol>
                            <div class="page-up-down" style="display: inline-block;border: solid 1px #BADBFF;font-size: 12px;color: #4C9AEF;border-radius: 1px;margin-left: 10px;border-left: solid 1px #BADBFF;">
                                <span class="page-up" style="cursor: pointer;">▲</span><span class="page-down" style="border-left: solid 1px #BADBFF;cursor: pointer;">▼</span>
                            </div>
                        </div>`;
		var dom = document.createElement('div');
		dom.id = 'simle_input_method';
		dom.className = 'simple-input-method';
		dom.innerHTML = temp;
		var that = this;
		// 初始化汉字选择和翻页键的点击事件
		dom.addEventListener('click', function(e) {
			var target = e.target;
			if (target.nodeName == 'LI') that.selectHanzi(parseInt(target.dataset.idx));
			else if (target.nodeName == 'SPAN') {
				if (target.className == 'page-up' && that.pageCurrent > 1) {
					that.pageCurrent--;
					that.refreshPage();
				} else if (target.className == 'page-down' && that.pageCurrent < that.pageCount) {
					that.pageCurrent++;
					that.refreshPage();
				}
			}
		})
		//document.body.appendChild(dom);
		//放在最前面
		// 获取 body 的第一个子元素
		var firstChild = document.body.firstChild;

		// 如果 body 有子元素，则在第一个子元素前插入 dom
		if (firstChild) {
			document.body.insertBefore(dom, firstChild);
		} else {
			// 如果 body 是空的，则直接添加
			document.body.appendChild(dom);
		}
		//动态添加css
		// 获取你想要添加样式的元素
		var element = document.getElementById('simle_input_method');
		// 确保元素存在
		if (element) {
			// 添加内联样式
			element.style.position = 'absolute';
			element.style.background = '#FFF';
			element.style.border = 'solid 1px #B5C5D2';
			element.style.fontFamily = 'Arial';
			element.style.color = '#0364CD';
			element.style.display = 'none'; // 这将使元素隐藏
		} else {
			console.error('元素未找到！');
		}

		//===================
		// 创建一个新的 div 元素
		var newDiv = document.createElement('div');
		newDiv.id = 'inputmethodapp';
		newDiv.style.position = 'fixed';
		newDiv.style.top = '5px';
		newDiv.style.left = '5px';
		newDiv.style.width = '65px';
		newDiv.style.height = '28px';
		newDiv.style.boxSizing = 'border-box'; //元素的宽度和高度就会包括内边距和边框
		newDiv.style.padding = '3px 0px 0px 3px'; // 上、右、下、左四个方向的内边距
		newDiv.style.zIndex = 99999999;
		newDiv.style.cursor = 'pointer';
		//newDiv.title = ''; // 添加鼠标悬停时显示的文字
		newDiv.style.borderRadius = '6px'; // 50% 的圆角会使正方形变成圆形
		newDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.3)'; // 设置半透明背景色（例如，半透明的黑色）
		var tubiao = this.onshift == true ? this.eng : this.zhong;
		newDiv.innerHTML =
			'<span id="ip_switch" title="这是网页版输入法，点击切换中英文输入" style="margin-right:8px;float:left">' + tubiao +
			'</span>' +
			`<span id='ip_textarea_btn' title="点击弹出输入框，解决部分网页输入失败" style="float:left"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
	<path fill="currentColor" d="M5 17h14v-2H5zm0-4h14v-2H5zm0-4h10V7H5zM4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h16q.825 0 1.413.588T22 6v12q0 .825-.587 1.413T20 20zm0-2h16V6H4zm0 0V6z" />
</svg></span>`;
		document.body.insertBefore(newDiv, document.body.firstChild || null); // 简化插入逻辑，如果body没有子元素，则直接添加
		var ip_switchapp = document.getElementById('ip_switch')
		ip_switchapp.addEventListener('click', this.onshiftHandler);
		document.getElementById('ip_textarea_btn').addEventListener('click', this.ip_textareaHandler);

		if (twoinit == 'two') {
			//二次加载重新定位
			that._target = document.querySelector('#simle_input_method');
			that._pinyinTarget = document.querySelector('#simle_input_method .pinyin');
			that._resultTarget = document.querySelector('#simle_input_method .py_result ol');
			var obj = document.activeElement;
			that.show(obj);
		}
	},
	/**
	 * ip_textarea按键的动作
	 */
	isshow: false, //控制点ip_textarea_btn，是显示还是隐藏
	ip_textareaHandler: function() {
		var ip_textarea = document.getElementById('ip_textarea');
		var that = SimpleInputMethod;
		if (that.isshow == false) {
			if (ip_textarea !== null) {
				//console.log('zai');
				ip_textarea.style.display = 'block'; //显示
			} else {
				//console.log('bu zai');
				//创建再显示
				var newDiv = document.createElement('div');
				newDiv.id = 'ip_textarea';
				newDiv.style.position = 'fixed';
				newDiv.style.top = '5px';
				newDiv.style.left = '75px';
				newDiv.style.width = '520px';
				newDiv.style.height = '210px';
				newDiv.style.textAlign = 'left';
				//newDiv.style.margin = '0';
				//newDiv.style.padding = '0';
				newDiv.style.boxSizing = 'border-box'; //元素的宽度和高度就会包括内边距和边框
				newDiv.style.color = '#fff';
				newDiv.style.boxSizing = 'border-box'; //元素的宽度和高度就会包括内边距和边框
				newDiv.style.padding = '3px 0px 0px 4px'; // 上、右、下、左四个方向的内边距
				newDiv.style.zIndex = 99999999;
				newDiv.style.borderRadius = '6px'; // 50% 的圆角会使正方形变成圆形
				newDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // 设置半透明背景色（例如，半透明的黑色）

				newDiv.innerHTML = `<textarea id="textToCopy" style="width: 98%; height: 180px; color:#000;margin-bottom:1px" placeholder="说明:这是一个简易的网页版输入法，主要在docker安装的浏览器里面使用\nshift键:切换中英状态\nctrl键:切换成英文状态" srf="pinyinapp"></textarea>
                                    <span id="ip_copy_btn"  style="margin: 0 50px 0 50px;cursor: pointer;">复制</span>
                                    <span id="ip_clean_btn" style="margin-right:50px;cursor: pointer;">清空</span>
                                    <span id="ip_close_btn" style="cursor: pointer;">关闭</span>
                                    <span id="ip_alert_txt" style="float:right;margin-right:10px"></span>`;
				document.body.insertBefore(newDiv, document.body.firstChild ||
					null); // 简化插入逻辑，如果body没有子元素，则直接添加
				document.getElementById('ip_copy_btn').addEventListener('click', function() {
					// 获取要复制的文本
					var text = document.getElementById("textToCopy").value;

					// 使用现代API复制文本到剪贴板
					navigator.clipboard.writeText(text).then(function() {
						// 复制成功后的回调
						if (text == '') {
							document.getElementById('ip_alert_txt').innerHTML = "内容为空!";
						} else {
							document.getElementById('ip_alert_txt').innerHTML = "已复制!";
						}
						setTimeout(function() {
							document.getElementById('ip_alert_txt').innerHTML = "";
						}, 1500);
					}).catch(function(err) {
						// 复制失败后的回调
						document.getElementById('ip_alert_txt').innerHTML = "出错！";
						console.log("复制文本到剪贴板时出错：" + err);
					});

				});
				document.getElementById('ip_clean_btn').addEventListener('click', function() {
					document.getElementById('textToCopy').value = ""; //清空
				});
				document.getElementById('ip_close_btn').addEventListener('click', function() {
					document.getElementById('ip_textarea').style.display = 'none'; //关闭
					that.isshow = false;
				});


				//拖拽--------------
				let isDragging = false;
				let offsetX, offsetY;

				newDiv.addEventListener('mousedown', (e) => {
					// 检查点击是否发生在textarea上
					const textarea = newDiv.querySelector('textarea');
					if (textarea && textarea.contains(e.target)) {
						// 如果点击在textarea上，则不启动拖拽
						return;
					}
					isDragging = true;
					offsetX = e.clientX - newDiv.offsetLeft;
					offsetY = e.clientY - newDiv.offsetTop;
					document.addEventListener('mousemove', onMouseMove);
					document.addEventListener('mouseup', onMouseUp);
				});

				function onMouseMove(e) {
					if (!isDragging) return;
					newDiv.style.left = `${e.clientX - offsetX}px`;
					newDiv.style.top = `${e.clientY - offsetY}px`;
				}

				function onMouseUp() {
					isDragging = false;
					document.removeEventListener('mousemove', onMouseMove);
					document.removeEventListener('mouseup', onMouseUp);
				}
				//--------------拖拽

			}
			that.isshow = true;
		} else {
			document.getElementById('ip_textarea').style.display = 'none'; //关闭
			that.isshow = false;
		}
		//扫描，重新监听
		that.removeAndReaddListener();
	},
	/**
	 * shift按键的动作
	 */
	onshiftHandler: function() {
		var that = SimpleInputMethod;
		that.onshift = !that.onshift;
		document.getElementById('ip_switch').innerHTML = that.onshift == true ? that.eng : that.zhong;
		if (that.onshift == true) that.hide();
		//扫描，重新监听
		that.removeAndReaddListener();
	},
	/**
	 * 初始化,给所有input添加标识
	 */
	initAdd: function() {

		// 获取页面上所有的 input 元素
		var inputs = document.querySelectorAll('input,textarea');
		//console.log(inputs.length)
		// 遍历每个 input 元素
		inputs.forEach(function(e) {
			//console.log(e.tagName.toLowerCase());
			if (e.tagName.toLowerCase() === 'input') {
				// 获取 input 元素的 type 属性
				var inputType = e.type;
				//console.log(inputType);
				// 判断 type 是否为 'text' 或者没有指定（默认为 'text'）
				if (inputType.toLowerCase() === 'text' || inputType.toLowerCase() != 'password') {
					// 给 input 元素设置 srf 属性，值为 'pinyinapp'
					e.setAttribute('srf', 'pinyinapp');
				} else {
					console.log("no input")
				}
			}
			if (e.tagName.toLowerCase() === 'textarea') {
				e.setAttribute('srf', 'pinyinapp');
			}
		});
		//测试功能，暂时不启用
		//查找contenteditable属性为true的元素
		var editableElementsTrue = document.querySelectorAll('[contenteditable="true"]');
		editableElementsTrue.forEach(function(e) {
			e.setAttribute('srf', 'pinyinapp');
		});
		//
	},
	/**
	 * 处理函数的引用
	 */
	keydownHandler: function(e) {
		var that = SimpleInputMethod;
		var keyCode = e.which || e.keyCode;
		var preventDefault = false;
		if (e.shiftKey) //shift onkey
		{
			that.onshiftHandler();
		}
		//console.log(keyCode)
		if (keyCode == 17 || that.onshift) { //按ctrl键，强迫改为英文输入状态
			that.onshift = true;
			document.getElementById('ip_switch').innerHTML = that.eng;
			that.hide();
		}
		if (keyCode == 27) { //按esc键，退出
			that.hide();
		}
		if (that.onshift == false) {
			if (keyCode >= 65 && keyCode <= 90) // A-Z
			{
				that.addChar(String.fromCharCode(keyCode + 32), this);
				preventDefault = true;
			} else if (keyCode == 8 && that.pinyin) // 删除键
			{
				that.delChar();
				preventDefault = true;
			} else if (keyCode >= 48 && keyCode <= 57 && !e.shiftKey && that.pinyin) // 1-9
			{
				that.selectHanzi(keyCode - 48);
				preventDefault = true;
			} else if (keyCode == 32 && that.pinyin) // 空格
			{
				that.selectHanzi(1);
				preventDefault = true;
			} else if ((keyCode == 33 || keyCode == 189 || keyCode == 173)) // 上翻页
			{
				if (that.pageCount > 0 && that.pageCurrent > 1) {
					that.pageCurrent--;
					that.refreshPage();
				}
				preventDefault = true;
			} else if ((keyCode == 34 || keyCode == 187 || keyCode == 61)) // 下翻页
			{
				if (that.pageCount > 0 && that.pageCurrent < that.pageCount) {
					that.pageCurrent++;
					that.refreshPage();
				}
				preventDefault = true;
			}
			if (preventDefault) e.preventDefault();
		}
	},
	focusHandler: function(e) {
		var that = SimpleInputMethod;
		that.initDom('two'); //重新加载
		if (that._input !== this) that.hide();
	},
	blurHandler: function(e) {
		var that = SimpleInputMethod;
		//that.hide();
	},
	/**
	 * 初始化监听 
	 */
	addInputListener: function() {
		var obj = document.querySelectorAll('[srf="pinyinapp"]');
		var that = this;
		for (var i = 0; i < obj.length; i++) {
			obj[i].addEventListener('keydown', this.keydownHandler);
			obj[i].addEventListener('focus', this.focusHandler);
			obj[i].addEventListener('blur', this.blurHandler);
		}
	},
	/**
	 * 更新重新监听
	 */
	removeAndReaddListener: function() {
		this.initAdd();
		var obj = document.querySelectorAll('[srf="pinyinapp"]');
		for (var i = 0; i < obj.length; i++) {
			obj[i].removeEventListener('keydown', this.keydownHandler);
			obj[i].removeEventListener('focus', this.focusHandler);
			obj[i].removeEventListener('blur', this.blurHandler);
		}
		// 为新元素添加事件监听器
		this.addInputListener();
	},
	/**
	 * 初始默认是中文状态
	 */
	init: function(method = 'zhong') {
		if (method == 'eng') this.onshift = true;
		this.initDict(); //初始化字典
		this.initDom(); //添加输入法面板
		this.initAdd();

		this._target = document.querySelector('#simle_input_method');
		this._pinyinTarget = document.querySelector('#simle_input_method .pinyin');
		this._resultTarget = document.querySelector('#simle_input_method .py_result ol');
		this.addInputListener(); //监听
		console.log('InputMethod start');
	},
	/**
	 * 单个拼音转单个汉字，例如输入 "a" 返回 "阿啊呵腌嗄吖锕"
	 */
	getSingleHanzi: function(pinyin) {
		return pinyinUtil.dict.py2hz2[pinyin] || pinyinUtil.dict.py2hz[pinyin] || '';
	},
	/**
	 * 拼音转汉字
	 * @param pinyin 需要转换的拼音，如 zhongguo
	 * @return 返回一个数组，格式类似：[["中","重","种","众","终","钟","忠"], "zhong'guo"]
	 */
	getHanzi: function(pinyin) {
		var result = this.getSingleHanzi(pinyin);
		if (result) return [result.split(''), pinyin];
		var temp = '';
		for (var i = 0, len = pinyin.length; i < len; i++) {
			temp += pinyin[i];
			result = this.getSingleHanzi(temp);
			if (!result) continue;
			// flag表示如果当前能匹配到结果、并且往后5个字母不能匹配结果，因为最长可能是5个字母，如 zhuang
			var flag = false;
			if ((i + 1) < pinyin.length) {
				for (var j = 1, len = pinyin.length; j <= 5 && (i + j) < len; j++) {
					if (this.getSingleHanzi(pinyin.substr(0, i + j + 1))) {
						flag = true;
						break;
					}
				}
			}
			var ts_arr = ['i', 'u', 'v'];
			var hou = pinyin.substr(i + 1);
			if (ts_arr.includes(hou.substr(0, 1))) hou = hou.substr(1); //没有uiv开头的拼音,把uiv这三种过滤掉
			if (hou != '') hou = "'" + hou; //如果过滤掉，还有其他字符，加'
			if (!flag) return [result.split(''), pinyin.substr(0, i + 1) + hou];
		}
		return [
			[], ''
		]; // 理论上一般不会出现这种情况
	},
	/**
	 * 选择某个汉字，i有效值为1-5
	 */
	selectHanzi: function(i) {
		var hz = this.result[(this.pageCurrent - 1) * this.pageSize + i - 1];
		if (!hz) return;
		this.hanzi += hz;
		var idx = this.pinyin.indexOf("'");
		if (idx > 0) {
			this.pinyin = this.pinyin.substr(idx + 1);
			this.refresh();
		} else // 如果没有单引号，表示已经没有候选词了
		{
			//把高频词放在最前面=========
			//console.log(this.hanzi)
			var hz_arr = Array.from(this.hanzi);
			//var local_dict = {};
			chrome.storage.local.get('local_dict', function(data) {
				if (chrome.runtime.lastError) {
					console.error('Error retrieving from local storage:', chrome.runtime.lastError);
				} else if (data.local_dict) {
					var local_dict = data.local_dict;
					console.log('s:' + local_dict);
					var dict = window.pinyinUtil.dict;
					for (var i = 0; i < hz_arr.length; i++) {
						var targetChar = hz_arr[i];
						for (var key in local_dict.py2hz) {
							if (local_dict.py2hz.hasOwnProperty(key)) {
								// 检查当前值是否包含目标字
								if (local_dict.py2hz[key].includes(targetChar)) {
									// 把高频词放在第一个
									local_dict.py2hz[key] = targetChar + local_dict.py2hz[key].replace(targetChar, '');
									//console.log(key + ": " + local_dict[key]);
								}
							}
						}
					}
					for (var i = 0; i < hz_arr.length; i++) {
						var targetChar = hz_arr[i];
						for (var key in local_dict.py2hz2) {
							if (local_dict.py2hz2.hasOwnProperty(key)) {
								// 检查当前值是否包含目标字
								if (local_dict.py2hz2[key].includes(targetChar)) {
									// 把高频词放在第一个
									local_dict.py2hz2[key] = targetChar + local_dict.py2hz2[key].replace(targetChar,
										'');
									//console.log(key + ": " + local_dict[key]);
								}
							}
						}
					}
					Object.assign(dict, local_dict);
					chrome.storage.local.set({
						local_dict: dict
					}, function() {
						if (chrome.runtime.lastError) {
							console.error('Error saving to local storage:', chrome.runtime.lastError);
						} else {
							console.log('local_dict saved successfully');
						}
					});
				} else {
					console.log('No data found for key "local_dict"');
				}
			}); //GM_getValue('local_dict');
			//console.log('s:' + local_dict);
			
			//GM_setValue("local_dict",dict);
			//====把高频词放在最前面



			if (this._input.contentEditable === "true") { //div元素可编辑的状态下
				this._input.innerHTML += this.hanzi;
			} else {
				var cursorPosition = this._input.selectionStart; //获取光标位置，判断文字插入的位置
				var cursorselectionEnd = this._input.selectionEnd;
				//console.log(cursorPosition);
				this._input.value = this._input.value.substr(0, cursorPosition) + this.hanzi + this._input.value
					.substr(cursorselectionEnd);
				this._input.selectionEnd = cursorPosition + this.hanzi.length;
				//以下是为了vue赋值更新
				var event = new Event('input', {
					bubbles: true
				});
				this._input.dispatchEvent(event);
				var changeEvent = new Event('change', {
					bubbles: true
				});
				this._input.dispatchEvent(changeEvent);

				//以下是为了React赋值更新
				var ele = this._input;
				const evt = new Event('change');
				ele.dispatchEvent(evt);
				const prop = Object.keys(ele).find(p => p.startsWith('__reactEventHandlers'));
				//console.log(prop);
				if (typeof ele[prop] !== 'undefined') {
					ele[prop].onChange(evt); // ele[prop] 存在，可以安全地使用它
				}

			}

			this.hide();
		}
	},
	/**
	 * 将拼音转换成汉字候选词，并显示在界面上
	 */
	refresh: function() {
		var temp = this.getHanzi(this.pinyin.replace(/'/g, ''));
		this.result = temp[0];
		this.pinyin = temp[1];
		var count = this.result.length;
		this.pageCurrent = 1;
		this.pageCount = Math.ceil(count / this.pageSize);
		this._pinyinTarget.innerHTML = this.hanzi + this.pinyin;
		//console.log(this.hanzi+ this.pinyin)
		this.refreshPage();
	},
	refreshPage: function() {
		var temp = this.result.slice((this.pageCurrent - 1) * this.pageSize, this.pageCurrent * this.pageSize);
		var html = '';
		var i = 0;
		temp.forEach(function(val) {
			html +=
				'<li style="color:#0364CD;list-style-type:decimal;float: left;margin-left: 30px;cursor: pointer;" data-idx="' +
				(++i) + '">' + val + '</li>';
		});
		this._target.querySelector('.page-up').style.opacity = this.pageCurrent > 1 ? '1' : '.3';
		this._target.querySelector('.page-down').style.opacity = this.pageCurrent < this.pageCount ? '1' : '.3';
		this._resultTarget.innerHTML = html;
		this._target.style.zIndex = 99999999;
		//用js实现第一个li 红色
		// 获取所有的 <li> 元素
		var listItems = this._resultTarget.querySelectorAll('li');
		//console.log(listItems)
		// 检查是否存在 <li> 元素
		if (listItems.length > 0) {
			// 获取第一个 <li> 元素并改变其颜色
			listItems[0].style.color = 'red';
		}
	},
	addChar: function(ch, obj) {
		if (this.pinyin.length == 0) // 长度为1，显示输入法
		{
			this.show(obj);
		}

		this.pinyin += ch;
		this.refresh();
	},
	delChar: function() {
		if (this.pinyin.length <= 1) {
			this.hide();
			return;
		}
		this.pinyin = this.pinyin.substr(0, this.pinyin.length - 1);
		this.refresh();
	},
	show: function(obj) {
		var pos = obj.getBoundingClientRect();
		this._target.style.left = pos.left + 'px';
		this._target.style.top = pos.top + pos.height + document.body.scrollTop + 'px';
		this._target.style.zIndex = 99999999;
		this._input = obj;
		//if(this._pinyinTarget.innerHTML!='')
		this._target.style.display = 'block';
	},
	hide: function() {
		this.reset();
		this._target.style.display = 'none';
	},
	reset: function() {
		this.hanzi = '';
		this.pinyin = '';
		this.result = [];
		this.pageCurrent = 1;
		this.pageCount = 0;
		this._pinyinTarget.innerHTML = '';
		this._resultTarget.innerHTML = '';
		//扫描，重新监听
		this.removeAndReaddListener();
	}
};
window.SimpleInputMethod = SimpleInputMethod;
window.SimpleInputMethod.init();
