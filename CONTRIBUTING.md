# Contributing to pymath

First off, thank you for considering contributing to pymath! It's people like you that make pymath such a great tool.

## Where do I go from here?

If you've noticed a bug or have a feature request, [make one](https://github.com/search?q=pymath&type=repositories)! It's generally best if you get confirmation of your bug or approval for your feature request this way before starting to code.

### Fork & create a branch

If this is something you think you can fix, then [fork pymath](https://github.com/search?q=pymath&type=repositories) and create a branch with a descriptive name.

A good branch name would be (where issue #38 is the ticket you're working on):

```sh
git checkout -b 38-add-fraction-support
```

### Get the test suite running

Be sure that you can run the test suite.

```sh
pytest
```

### Implement your fix or feature

At this point, you're ready to make your changes! Feel free to ask for help; everyone is a beginner at first :smile_cat:

### Make a Pull Request

At this point, you should switch back to your master branch and make sure it's up to date with pymath's master branch:

```sh
git remote add upstream git@github.com:pymath/pymath.git
git checkout master
git pull upstream master
```

Then update your feature branch from your local copy of master, and push it!

```sh
git checkout 38-add-fraction-support
git rebase master
git push --force-with-lease origin 38-add-fraction-support
```

Finally, go to GitHub and [make a Pull Request](https://github.com/search?q=pymath&type=repositories)

### Keep your Pull Request updated

If a maintainer asks you to "rebase" your PR, they're saying that a lot of code has changed, and that you need to update your branch so it's easier to merge.

To learn more about rebasing and Code of Conduct, check out this guide.
This is a general guideline. Feel free to deviate from it if it makes sense.
If you have any questions, feel free to ask. We're happy to help.
