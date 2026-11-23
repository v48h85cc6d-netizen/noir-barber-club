import { useEffect, useState } from 'react'
import { ReadyContext } from './context/ready'
import { BookingProvider, takeDraft, useBooking } from './context/booking'
import { ContactProvider } from './context/contact'
import { ScrollTrigger } from './lib/gsap'
import { Preloader } from './components/Preloader'
import { Nav } from './components/Nav'
import { BookingDrawer } from './booking/BookingWidget'
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
          <BookingDrawer />
          <BookingDeepLink ready={ready} />
        </BookingProvider>
      </ContactProvider>
    </ReadyContext.Provider>
  )
}

/**
 * ?book=1 opens the booking panel (e.g. from the customer account);
 * ?book=resume re-opens the choices kept while the visitor signed in.
 */
function BookingDeepLink({ ready }: { ready: boolean }) {
  const { open, resume } = useBooking()
  useEffect(() => {
    if (!ready) return
    const params = new URLSearchParams(window.location.search)
    const book = params.get('book')
    if (!book) return
    params.delete('book')
    const qs = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
    const draft = book === 'resume' ? takeDraft() : null
    if (draft) resume(draft)
    else open()
  }, [ready, open, resume])
  return null
}
