"use client";
import { useEffect, useState } from "react";
import { weatherAdvice, type WeatherDay } from "@/domain/planning/doc-weather-advice";
import { weatherForecastSchema } from "@/lib/validation/doc-weather";

type Forecast = Readonly<{ label:string; current:{temperatureC:number;humidity:number;observedLocal:string}; days:WeatherDay[]; updatedAt:string }>;
export function DocWeather({ city = "da-lat", compact = false }: Readonly<{ city?: "da-lat"|"nha-trang"; compact?:boolean }>) {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [message,setMessage] = useState("Đang tải dự báo…");
  const [clock,setClock] = useState("—");
  useEffect(() => {
    const refresh = () => setClock(new Intl.DateTimeFormat("vi-VN", {timeZone:"Asia/Ho_Chi_Minh",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date()));
    refresh();const handle = setInterval(refresh,60_000);return ()=>clearInterval(handle);
  },[]);
  useEffect(() => {
    let active = true;
    const getForecast = async () => {
      try {const res=await fetch(`/api/v1/doc-weather?city=${city}`,{cache:"no-store"});if(!res.ok)throw new Error();
        const body:unknown=await res.json();
        const data=weatherForecastSchema.parse(body && typeof body==="object" && "data" in body?body.data:null);
        if(data.city!==city)throw new Error();
        if(active){setForecast(data);setMessage("");}
      }catch{if(active){setForecast(null);setMessage("Chưa có dự báo trực tuyến. Vui lòng kiểm tra lại khi có mạng.");}}
    };
    void getForecast();const id=setInterval(()=>void getForecast(),900_000);return ()=>{active=false;clearInterval(id);};
  },[city]);
  return <section className={`doc-weather ${compact?"doc-weather-compact":""}`} aria-label={`Thời tiết ${city}`}>
    <div className="doc-weather-head"><div><small>THỜI GIAN & DỰ BÁO</small><h2>{city==="da-lat"?"Đà Lạt":"Nha Trang"} <span>· {clock} ICT</span></h2></div><span aria-hidden="true">☁</span></div>
    {forecast ? <><p className="doc-weather-now">Hiện tại <strong>{Math.round(forecast.current.temperatureC)}°C</strong> · Độ ẩm {Math.round(forecast.current.humidity)}%</p>
       <div className="doc-weather-days">{forecast.days.slice(0, compact?3:7).map(day=>{
         const tip=weatherAdvice(day);return <div key={day.date} className="doc-weather-day"><time dateTime={day.date}>{day.date.slice(5)}</time><strong>{Math.round(day.minC)}–{Math.round(day.maxC)}°</strong><span>Mưa {Math.round(day.rainChance)}%</span><small>{tip.message}</small></div>;
       })}</div><p className="doc-weather-credit">Dự báo tham khảo, không phải cam kết thời tiết. Nguồn: <a href="https://open-meteo.com/" rel="noreferrer" target="_blank">Open-Meteo (CC BY 4.0)</a>. Cần kiểm tra trước khi khởi hành.</p></> : <p role="status">{message}</p>}
  </section>;
}
