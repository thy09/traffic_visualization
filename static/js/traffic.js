var vm = new Vue({
    el: '#traffic-canvas',
    data:{
        show_conns: true,
        id2name: {},
        id2hint: {},
        ids: [],
        files: [],
        data: {},
        time_data: {
            keys: [],
            data: {}
        },
        timedata: [],
        start_ts: 0,
        end_ts: 0,
        end_time: "结束时间",
        bar_width: 1000,
        cur_f: null,
        max_traffic_range: 1000,
        traffic_range: 500
    },
    created: function(){
        url = "./key2files.json";
        axios.get(url).then(function(resp){
            this.files = resp.data;
            this.files.sort();
            console.log(this.files);
            this.cur_f = this.files[0];
            this.loadFile();
        }.bind(this));   
    },
    methods: {
        formatDate: function(date){
            var hour = date.getHours();
            var minutes = date.getMinutes();
            var seconds = date.getSeconds();
            minutes = minutes < 10 ? '0'+minutes : minutes;
            seconds = seconds < 10 ? '0'+seconds : seconds;
            return hour + ":" + minutes + ":" + seconds;
        },
        showTimeBar: function(){
            var ts = this.start_ts;
            var date_end = new Date(this.end_ts * 1000);
            this.end_time = this.formatDate(date_end);
            var k = 9;
            var delta = (this.end_ts - this.start_ts)/k;
            this.timedata = []
            for (var i=0;i<k;i++){
                var date = new Date(ts * 1000);
                this.timedata.push({
                    "time": this.formatDate(date),
                    "style": {
                        "left": (100.0/k*i) + "%"
                    },
                    "ts": ts
                });
                ts = ts + delta;
            }
        },
        showBars: function(){
            this.keys = [];
            this.showTimeBar();
            minWidth = 0.2;
            var names = ["width","height","left","top"];
            var data = this.data;
            var total_time = this.end_ts - this.start_ts;
            for (var i=0;i<keys.length;i++){
                var app_data = data.data[keys[i]];
                this.id2hint[keys[i]] = keys[i];
                this.id2hint[keys[i]] += "\n持续时间:" + app_data.lease_time.toFixed(2) +"秒";
                this.id2hint[keys[i]] += "\n流量:" + (app_data.traffic / (1024.0)).toFixed(2) + "K";
                var count = 0;
                for (var j=0;j<app_data.conns.length;j++){
                    var conn = app_data.conns[j];
                    if (conn.start_ts > this.end_ts || conn.end_ts < this.start_ts){
                        conn.style = {"height": 0};
                        continue;
                    }
                    count += 1;
                    var lease = (conn.end_ts - conn.start_ts);
                    var start = (conn.start_ts - this.start_ts);
                    conn.style = {}
                    conn.style.left = 100 * start / total_time;
                    conn.style.width = 100 * lease / total_time;
                    if (conn.style.width <= minWidth){
                        conn.style.width = minWidth;
                    }
                    var h_upper = 90.0;
                    var h_lower = 0.9;
                    var ratio = 1024.0 / this.traffic_range * this.max_traffic_range;
                    conn.style.height = h_upper * conn.traffic / ratio / conn.style.width;
                    if (conn.style.height > h_upper){
                        conn.style.height = h_upper;
                    }
                    if (conn.style.height < h_lower){
                        conn.style.height = h_lower;
                    }
                    conn.style.top = (100 - conn.style.height) / 2;

                    for (var k = 0;k<names.length;k++){
                        conn.style[names[k]] = conn.style[names[k]] + "%";
                    }
                    conn.hint = "连接" + j;
                    conn.hint += "\n开始时间:" + this.formatDate(new Date(conn.start_ts * 1000)) + "\n持续时间:" + lease.toFixed(2) +"秒"
                    conn.hint += "\n流量:" + conn.traffic/1024.0+"K"
                    if (lease > 1){
                        conn.hint += "\n带宽:" + (conn.traffic/128.0/lease).toFixed(2) + "Kbps";
                    }
                    if (conn.url.length > 0){
                        conn.hint = conn.hint + "\nURL:" + conn.url;
                    }
                    if (conn.ua.length > 0){
                        conn.hint = conn.hint + "\nUA:" + decodeURI(conn.ua);
                    }
                }
                this.id2hint[keys[i]] += "\n连接数:" + count;
            }
        },
        loadFile: function(){
            var f = this.cur_f;
            axios.get(f).then(function(resp){
                console.log(resp.data);
                keys = Object.keys(resp.data.data);
                keys.sort(function(k1, k2){
                    return resp.data.data[k2].traffic - resp.data.data[k1].traffic;
                })

                this.data = resp.data;
                this.ids = keys;
                this.start_ts = resp.data.start_ts;
                this.end_ts = resp.data.start_ts + resp.data.total_time;
                if (this.show_conns){
                    this.showBars();                   
                }
            }.bind(this));
        },
        updateTimestamp: function(ts){
            if (confirm("设为开始时间？若选否则设为结束时间")){
                this.start_ts = ts;
            }else{
                this.end_ts = ts;
                if (ts <= this.start_ts){
                    return;
                }
            }
            this.showBars();
        },
        resetTimestamp: function(){
            this.start_ts = this.data.start_ts;
            this.end_ts = this.data.start_ts + this.data.total_time;
            this.showBars();
        },
        triggerConns: function(){
            this.show_conns = !this.show_conns;
            if (this.show_conns){
                this.showBars();
            }
        }
    }
});