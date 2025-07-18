import { Card, CardContent } from "@/components/ui/card";

export function ProblemSection() {
  return (
    <section className="py-16 bg-jules-primary-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
            The Jules Productivity Paradox
          </h2>
        </div>

        <blockquote className="text-lg sm:text-xl md:text-2xl italic text-center leading-relaxed text-white">
          &ldquo;Jules gives you 60 tasks per day but only 5 concurrent slots.
          So you&rsquo;re constantly babysitting the queue, manually re-adding
          labels every time it hits the limit. There has to be a better
          way.&rdquo;
        </blockquote>
        <p className="text-center text-sm sm:text-base mt-6 text-gray-300">
          — Every Jules power user, probably
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <Card className="border bg-jules-darker border-jules-yellow">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold mb-2 text-jules-yellow">
                60
              </div>
              <div className="text-white">Daily Tasks</div>
              <div className="text-sm text-gray-400 mt-2">
                Jules&rsquo; generous quota
              </div>
            </CardContent>
          </Card>

          <Card className="border bg-jules-darker border-jules-pink">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold mb-2 text-jules-pink">5</div>
              <div className="text-white">Concurrent Limit</div>
              <div className="text-sm text-gray-400 mt-2">
                The productivity bottleneck
              </div>
            </CardContent>
          </Card>

          <Card className="border bg-jules-darker border-jules-cyan">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold mb-2 text-jules-cyan">∞</div>
              <div className="text-white">With Queue</div>
              <div className="text-sm text-gray-400 mt-2">
                True automation, finally
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
