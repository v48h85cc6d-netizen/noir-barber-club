import { useEffect, useState } from 'react'
import { ReadyContext } from './context/ready'
import { BookingProvider } from './context/booking'
import { ContactProvider } from './context/contact'
import { ScrollTrigger } from './lib/gsap'
import { Preloader } from './components/Preloader'
import { Nav } from './components/Nav'
import { Marquee } from './components/Marquee'
import { Hero } from './sections/Hero'
import { Club } from './sections/Club'
import { Booking } from './sections/Booking'
import { Barbers } from './sections/Barbers'
import { Services } from './sections/Services'
import { Gallery } from './sections/Gallery'
import { GiftCards } from './sections/GiftCards'
import { Membership } from './sections/Membership'
import { Reviews } from './sections/Reviews'
import { Visit } from './sections/Visit'
import { Footer } from './sections/Footer'

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!ready) return
    // once everything has mounted its triggers, measure again
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 400)
    return () => window.clearTimeout(id)
  }, [ready])

  return (
    <ReadyContext.Provider value={ready}>
      <ContactProvider>
        <BookingProvider>
          <Preloader onDone={() => setReady(true)} />
          <div className="grain" aria-hidden />
          <Nav />
          <main>
            <Hero />
            <Club />
            <div className="border-y border-line bg-ink py-6 text-paper md:py-10">
              <Marquee items={['Precision cuts', 'Hot towel shaves', 'Beard work', 'Members club']} />
            </div>
            <Booking />
            <Barbers />
            <Services />
            <Gallery />
            <GiftCards />
            <Membership />
            <Reviews />
            <Visit />
          </main>
          <Footer />
        </BookingProvider>
      </ContactProvider>
    </ReadyContext.Provider>
  )
}
