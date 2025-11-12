import Appbar from "@/mycomponents/Appbar";
import Hero from "@/mycomponents/Hero";
import HeroVideo from "@/mycomponents/HeroVideo";


export default function Home() {
  return (
    <main className='pb-48'>
<Appbar/>
<Hero/>
<div className='pt-8'>
<HeroVideo/>
</div>
    </main>
  );
}